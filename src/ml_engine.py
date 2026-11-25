import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

DEFAULT_MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", "/app/models/valuation_model.joblib"))

STANDARD_BUILDING_TYPES = ["住宅大樓", "華廈", "公寓", "透天厝", "套房", "其他"]


def normalize_building_type(raw_state: Optional[str]) -> str:
    """將實價登錄原始 building_state 歸類為統一建物型態。"""
    if not raw_state:
        return "其他"
    text_val = str(raw_state)
    for btype in ("住宅大樓", "華廈", "公寓", "透天厝", "套房"):
        if btype in text_val:
            return btype
    return "其他"


def next_quarter(year: int, season: int, steps: int = 1) -> tuple[int, int]:
    """依民國年與季別（1~4）向後推算 steps 季。"""
    total_q = year * 4 + (season - 1) + steps
    return total_q // 4, (total_q % 4) + 1


def _build_trend_features(t_idx: np.ndarray, seasons: np.ndarray) -> np.ndarray:
    """建立時間趨勢（含阻尼項）＋ 季度週期特徵矩陣。"""
    t = t_idx.astype(float)
    q1 = (seasons == 1).astype(float)
    q2 = (seasons == 2).astype(float)
    q3 = (seasons == 3).astype(float)
    return np.column_stack([t, q1, q2, q3])


def _fit_weighted_ridge_forecast(
    df: pd.DataFrame,
    value_col: str,
    horizon: int,
    decay: float = 0.88,
    alpha: float = 4.0,
) -> tuple[np.ndarray, float, float]:
    """
    針對季度單價序列擬合指數遞減加權的 Ridge 季節性迴歸模型，
    使用 log(price) 建模並對未來遠期趨勢施以溫和阻尼，避免過度外推。
    回傳：(未來 horizon 季預測值陣列, 殘差標準差(log空間), 樣本內/回測 MAPE%)
    """
    y_raw = df[value_col].astype(float).to_numpy()
    n = len(y_raw)
    t_idx = np.arange(n, dtype=float)
    seasons = df["season"].astype(int).to_numpy()

    y_log = np.log(np.clip(y_raw, 1.0, None))
    weights = np.power(decay, (n - 1) - t_idx)
    if "volume" in df.columns:
        vol = np.clip(df["volume"].astype(float).to_numpy(), 1.0, None)
        vol_factor = np.log1p(vol)
        weights = weights * (vol_factor / np.mean(vol_factor))

    X = _build_trend_features(t_idx, seasons)
    model = Ridge(alpha=alpha)
    model.fit(X, y_log, sample_weight=weights)

    # 取得基準點與最後一季實際值做平滑銜接，避免起跳斷層
    fitted_log = model.predict(X)
    last_actual_log = float(y_log[-1])
    last_fitted_log = float(fitted_log[-1])
    anchor_gap = last_actual_log - last_fitted_log

    # 計算最近期加權殘差標準差（用來估算預測信賴區間）
    residuals = y_log - fitted_log
    weighted_var = float(np.average(residuals ** 2, weights=weights))
    sigma_log = max(math.sqrt(weighted_var), 0.025)

    # 滾動回測最後 1~4 季的 MAPE（當歷史季數足夠時）
    mape_values: List[float] = []
    if n >= 8:
        eval_steps = min(4, n - 6)
        for cut in range(n - eval_steps, n):
            sub_X = X[:cut]
            sub_y = y_log[:cut]
            sub_w = np.power(decay, (cut - 1) - np.arange(cut, dtype=float))
            bt_model = Ridge(alpha=alpha)
            bt_model.fit(sub_X, sub_y, sample_weight=sub_w)
            pred_1 = float(np.exp(bt_model.predict(X[cut : cut + 1])[0]))
            actual_1 = float(y_raw[cut])
            if actual_1 > 0:
                mape_values.append(abs(actual_1 - pred_1) / actual_1 * 100.0)

    if mape_values:
        mape_pct = float(np.mean(mape_values))
    else:
        fitted_raw = np.exp(fitted_log)
        mape_pct = float(np.mean(np.abs(y_raw - fitted_raw) / np.clip(y_raw, 1.0, None)) * 100.0)

    # 產生未來 horizon 季預測（對斜率採溫和阻尼，且讓 anchor_gap 逐季收斂）
    last_year = int(df["year"].iloc[-1])
    last_season = int(df["season"].iloc[-1])
    future_preds: List[float] = []

    slope = float(model.coef_[0])
    # 限制單季對數趨勢斜率在合理範圍內（約每季 -3.5% ~ +3.5%），避免極端雜訊暴衝
    clamped_slope = float(np.clip(slope, -0.035, 0.035))
    q_coefs = model.coef_[1:4]
    intercept = float(model.intercept_)

    damping = 0.85
    cum_damped_steps = 0.0
    for h in range(1, horizon + 1):
        _, f_season = next_quarter(last_year, last_season, h)
        cum_damped_steps += damping ** (h - 1)
        seasonal_effect = float(q_coefs[f_season - 1]) if f_season in (1, 2, 3) else 0.0
        raw_future_log = intercept + clamped_slope * ((n - 1) + cum_damped_steps) + seasonal_effect
        # 錨點誤差依 0.65^h 平滑衰減，保持與最新一季實際價格自然銜接
        adj_future_log = raw_future_log + anchor_gap * (0.65 ** h)
        future_preds.append(round(float(np.exp(adj_future_log)), 2))

    return np.array(future_preds, dtype=float), sigma_log, round(min(mape_pct, 35.0), 2)


def forecast_quarterly_trend(
    rows: List[Dict[str, Any]],
    horizon: int = 4,
    use_district: bool = False,
) -> Dict[str, Any]:
    """
    根據歷史季度趨勢資料，預測未來 horizon 季房價走勢與信賴區間。
    若為特定行政區且成交筆數偏少，會自動將預測與全縣市趨勢做平滑縮減（Shrinkage）以提升穩定度。
    """
    if not rows:
        return {
            "available": False,
            "reason": "歷史季度資料不足，無法建立趨勢預測模型",
            "forecast": [],
        }

    df = pd.DataFrame(rows)
    df["year"] = df["year"].astype(int)
    df["season"] = df["season"].astype(int)
    df["district_avg"] = pd.to_numeric(df["district_avg"], errors="coerce")
    df["city_avg"] = pd.to_numeric(df["city_avg"], errors="coerce")
    df["district_volume"] = pd.to_numeric(df.get("district_volume", 1), errors="coerce").fillna(1)
    df = df.dropna(subset=["district_avg", "city_avg"]).sort_values(["year", "season"]).reset_index(drop=True)

    # 只取最近 28 季（約 7 年）讓模型聚焦近代房市結構
    if len(df) > 28:
        df = df.tail(28).reset_index(drop=True)

    if len(df) < 4:
        return {
            "available": False,
            "reason": "符合條件的歷史季數少於 4 季，暫不產生預測",
            "forecast": [],
        }

    target_df = df[["year", "season", "district_avg", "district_volume"]].rename(
        columns={"district_volume": "volume"}
    )
    city_df = df[["year", "season", "city_avg"]].copy()
    city_df["volume"] = 100.0

    dist_preds, sigma_log, mape_pct = _fit_weighted_ridge_forecast(
        target_df, value_col="district_avg", horizon=horizon
    )

    # 若為特定行政區且近期均量偏低，導入縣市走勢變化率做階層式平滑縮減
    avg_recent_vol = float(df["district_volume"].tail(4).mean())
    if use_district and avg_recent_vol < 60:
        city_preds, city_sigma, _ = _fit_weighted_ridge_forecast(
            city_df, value_col="city_avg", horizon=horizon
        )
        last_city = float(df["city_avg"].iloc[-1])
        last_dist = float(df["district_avg"].iloc[-1])
        if last_city > 0 and last_dist > 0:
            city_scaled_preds = last_dist * (city_preds / last_city)
            shrink_weight = avg_recent_vol / (avg_recent_vol + 25.0)
            dist_preds = shrink_weight * dist_preds + (1.0 - shrink_weight) * city_scaled_preds
            sigma_log = shrink_weight * sigma_log + (1.0 - shrink_weight) * max(city_sigma, 0.03)

    last_year = int(df["year"].iloc[-1])
    last_season = int(df["season"].iloc[-1])
    last_actual = float(df["district_avg"].iloc[-1])

    # 80% 預測區間 z = 1.2816，並隨預測期數以 sqrt(h) 適度放寬
    z_score = 1.2816
    forecast_points: List[Dict[str, Any]] = []
    for idx in range(horizon):
        h = idx + 1
        f_year, f_season = next_quarter(last_year, last_season, h)
        pred_val = float(dist_preds[idx])
        band_log = z_score * sigma_log * math.sqrt(h)
        lower = round(pred_val * math.exp(-band_log), 2)
        upper = round(pred_val * math.exp(band_log), 2)
        forecast_points.append(
            {
                "year": f_year,
                "season": f_season,
                "label": f"{f_year}-Q{f_season}",
                "predicted_price": round(pred_val, 2),
                "lower_bound": max(lower, 1.0),
                "upper_bound": upper,
            }
        )

    final_pred = forecast_points[-1]["predicted_price"]
    expected_change_pct = round(((final_pred - last_actual) / last_actual) * 100.0, 2) if last_actual > 0 else 0.0

    if expected_change_pct >= 1.5:
        trend_direction = "溫和看漲"
    elif expected_change_pct <= -1.5:
        trend_direction = "溫和回檔"
    else:
        trend_direction = "高檔盤整"

    return {
        "available": True,
        "model_name": "Recency-Weighted Seasonal Ridge (阻尼趨勢＋季度週期)",
        "training_quarters": int(len(df)),
        "last_actual_quarter": f"{last_year}-Q{last_season}",
        "last_actual_price": round(last_actual, 2),
        "horizon_quarters": horizon,
        "final_predicted_price": final_pred,
        "expected_change_pct": expected_change_pct,
        "trend_direction": trend_direction,
        "backtest_mape": mape_pct,
        "forecast": forecast_points,
    }


class ValuationModelService:
    """載入離線訓練好的 HistGradientBoosting 估價模型並提供即時單戶行情預測。"""

    def __init__(self, model_path: Path = DEFAULT_MODEL_PATH):
        self.model_path = Path(model_path)
        self._artifact: Optional[Dict[str, Any]] = None
        self._mtime: Optional[float] = None

    def _ensure_loaded(self) -> Optional[Dict[str, Any]]:
        if not self.model_path.exists():
            return None
        current_mtime = self.model_path.stat().st_mtime
        if self._artifact is None or self._mtime != current_mtime:
            self._artifact = joblib.load(self.model_path)
            self._mtime = current_mtime
        return self._artifact

    def get_info(self) -> Dict[str, Any]:
        artifact = self._ensure_loaded()
        if artifact is None:
            return {
                "loaded": False,
                "message": "估價模型尚未訓練，請執行 python /app/src/train_ml_models.py",
            }
        return {
            "loaded": True,
            "model_name": artifact.get("model_name"),
            "trained_at": artifact.get("trained_at"),
            "latest_quarter": artifact.get("latest_quarter"),
            "training_rows": artifact.get("training_rows"),
            "metrics": artifact.get("metrics"),
            "supported_building_types": artifact.get("supported_building_types", STANDARD_BUILDING_TYPES),
        }

    def predict(
        self,
        city: str,
        district: Optional[str],
        building_type: str,
        building_pings: float,
        building_age: Optional[float],
        parking_price: float = 0.0,
    ) -> Dict[str, Any]:
        artifact = self._ensure_loaded()
        if artifact is None:
            raise RuntimeError("AI 估價模型尚未就緒，請先執行模型訓練腳本。")

        model = artifact["model"]
        city_clean = city.strip()
        district_clean = district.strip() if district and district.strip() != "all" else ""
        btype_clean = normalize_building_type(building_type)

        city_stats: Dict[str, Dict[str, float]] = artifact["city_stats"]
        township_stats: Dict[str, Dict[str, float]] = artifact["township_stats"]
        township_type_stats: Dict[str, Dict[str, float]] = artifact["township_type_stats"]
        global_median = float(artifact["global_median"])

        city_info = city_stats.get(city_clean, {"median": global_median, "count": 0})
        city_median = float(city_info["median"])

        if district_clean:
            tk = f"{city_clean}|{district_clean}"
            t_info = township_stats.get(tk)
            if t_info:
                township_median = float(t_info["median"])
                sample_support = int(t_info["count"])
            else:
                township_median = city_median
                sample_support = int(city_info.get("count", 0))

            tt_key = f"{tk}|{btype_clean}"
            tt_info = township_type_stats.get(tt_key)
            if tt_info and tt_info["count"] >= 10:
                township_type_median = float(tt_info["median"])
            else:
                township_type_median = township_median
        else:
            tk = f"{city_clean}|ALL"
            township_median = city_median
            township_type_median = city_median
            sample_support = int(city_info.get("count", 0))

        # 使用訓練時的類別編碼對照表（若為未見值則安全對應至 -1 / unknown）
        city_map: Dict[str, int] = artifact["city_categories"]
        township_map: Dict[str, int] = artifact["township_categories"]
        btype_map: Dict[str, int] = artifact["btype_categories"]

        city_code = float(city_map[city_clean]) if city_clean in city_map else np.nan
        township_code = float(township_map.get(tk, -1))
        btype_code = float(btype_map[btype_clean]) if btype_clean in btype_map else float(btype_map.get("其他", 0))

        pings_val = float(np.clip(building_pings, 5.0, 300.0))
        age_val = np.nan if building_age is None else float(np.clip(building_age, 0.0, 90.0))
        latest_time_idx = float(artifact["latest_time_index"])

        X_pred = pd.DataFrame(
            [
                {
                    "city_code": city_code,
                    "township_code": township_code,
                    "btype_code": btype_code,
                    "building_pings": pings_val,
                    "building_age": age_val,
                    "time_index": latest_time_idx,
                    "city_median": city_median,
                    "township_median": township_median,
                    "township_type_median": township_type_median,
                }
            ]
        )

        pred_log = float(model.predict(X_pred)[0])
        predicted_unit_price = max(round(float(np.expm1(pred_log)), 2), 1.0)

        # 使用驗證集校準過的對數殘差分位數（q15 / q85）產生合理行情區間
        q_low = float(artifact.get("residual_q15", -0.14))
        q_high = float(artifact.get("residual_q85", 0.14))
        unit_price_low = max(round(float(np.expm1(pred_log + q_low)), 2), 1.0)
        unit_price_high = max(round(float(np.expm1(pred_log + q_high)), 2), predicted_unit_price)

        parking_val = max(float(parking_price or 0.0), 0.0)
        predicted_total_wan = round(predicted_unit_price * pings_val + parking_val, 1)
        total_low_wan = round(unit_price_low * pings_val + parking_val, 1)
        total_high_wan = round(unit_price_high * pings_val + parking_val, 1)

        benchmark = township_median if district_clean else city_median
        vs_benchmark_pct = round(((predicted_unit_price - benchmark) / benchmark) * 100.0, 1) if benchmark > 0 else 0.0

        if sample_support >= 300:
            confidence_level = "高"
        elif sample_support >= 60:
            confidence_level = "中"
        else:
            confidence_level = "參考"

        return {
            "city": city_clean,
            "district": district_clean or "全區",
            "building_type": btype_clean,
            "building_pings": pings_val,
            "building_age": None if building_age is None else round(float(building_age), 1),
            "parking_price": parking_val,
            "predicted_unit_price": predicted_unit_price,
            "unit_price_low": unit_price_low,
            "unit_price_high": unit_price_high,
            "predicted_total_price_wan": predicted_total_wan,
            "total_price_low_wan": total_low_wan,
            "total_price_high_wan": total_high_wan,
            "benchmark_unit_price": round(benchmark, 2),
            "vs_benchmark_pct": vs_benchmark_pct,
            "sample_support": sample_support,
            "confidence_level": confidence_level,
            "latest_quarter": artifact.get("latest_quarter"),
            "model_metrics": artifact.get("metrics"),
        }
