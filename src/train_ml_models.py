"""
離線訓練腳本：從 PostgreSQL 讀取實價登錄資料，訓練 HistGradientBoosting 房價估價模型。
執行方式（於 Docker 後端容器內）：
    docker exec real_estate_backend python /app/src/train_ml_models.py
"""

import os
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sqlalchemy import create_engine, text

from ml_engine import (
    DEFAULT_MODEL_PATH,
    STANDARD_BUILDING_TYPES,
    normalize_building_type,
)

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin123@db:5432/real_estate")
MODEL_PATH = Path(os.getenv("ML_MODEL_PATH", str(DEFAULT_MODEL_PATH)))

# 使用民國 110 年起（2021~2026）之近代實價登錄資料，兼顧跨區域覆蓋率與市場時效性
MIN_ROC_YEAR = 110
MAX_TRAIN_SAMPLES = 700_000


def fetch_training_dataframe(engine) -> pd.DataFrame:
    query = text(
        """
        SELECT
            city,
            township,
            building_state,
            building_pings::float AS building_pings,
            building_age_at_transaction::float AS building_age,
            unit_price_per_ping::float AS unit_price_per_ping,
            year::int AS year,
            season::int AS season
        FROM housing_data_clean
        WHERE is_special_transaction = FALSE
          AND transaction_western_date IS NOT NULL
          AND city IS NOT NULL
          AND township IS NOT NULL
          AND year >= :min_year
          AND season BETWEEN 1 AND 4
          AND unit_price_per_ping BETWEEN 3 AND 350
          AND building_pings BETWEEN 5 AND 300
        """
    )
    print(f"[ML Train] 正在從資料庫讀取民國 {MIN_ROC_YEAR} 年後實價登錄資料...")
    t0 = time.time()
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"min_year": MIN_ROC_YEAR})
    print(f"[ML Train] 讀取完成：{len(df):,} 筆資料（耗時 {time.time() - t0:.1f}s）")
    return df


def build_smoothed_stats(train_df: pd.DataFrame) -> tuple[float, dict, dict, dict]:
    """僅用訓練集計算階層式平滑中位數，避免資料洩漏。"""
    # 聚焦近 3 年交易作為當前區域行情基準
    max_time = int(train_df["time_index"].max())
    recent_df = train_df[train_df["time_index"] >= max_time - 11]
    if len(recent_df) < 50_000:
        recent_df = train_df

    global_median = float(recent_df["unit_price_per_ping"].median())

    city_grp = recent_df.groupby("city")["unit_price_per_ping"].agg(["median", "count"])
    city_stats = {
        str(k): {"median": round(float(row["median"]), 2), "count": int(row["count"])}
        for k, row in city_grp.iterrows()
    }

    township_grp = recent_df.groupby("township_key")["unit_price_per_ping"].agg(["median", "count"])
    township_stats = {}
    for tk, row in township_grp.iterrows():
        city_name = str(tk).split("|", 1)[0]
        c_med = city_stats.get(city_name, {"median": global_median})["median"]
        cnt = int(row["count"])
        raw_med = float(row["median"])
        # 樣本較少行政區向縣市中位數平滑
        smoothed = (cnt * raw_med + 15.0 * c_med) / (cnt + 15.0)
        township_stats[str(tk)] = {"median": round(smoothed, 2), "count": cnt}

    tt_grp = recent_df.groupby("township_type_key")["unit_price_per_ping"].agg(["median", "count"])
    township_type_stats = {}
    for ttk, row in tt_grp.iterrows():
        parts = str(ttk).split("|")
        tk = f"{parts[0]}|{parts[1]}"
        t_med = township_stats.get(tk, {"median": global_median})["median"]
        cnt = int(row["count"])
        raw_med = float(row["median"])
        smoothed = (cnt * raw_med + 20.0 * t_med) / (cnt + 20.0)
        township_type_stats[str(ttk)] = {"median": round(smoothed, 2), "count": cnt}

    return global_median, city_stats, township_stats, township_type_stats


def encode_features(
    df: pd.DataFrame,
    city_categories: dict,
    township_categories: dict,
    btype_categories: dict,
    global_median: float,
    city_stats: dict,
    township_stats: dict,
    township_type_stats: dict,
) -> pd.DataFrame:
    city_med_map = {k: v["median"] for k, v in city_stats.items()}
    township_med_map = {k: v["median"] for k, v in township_stats.items()}
    tt_med_map = {k: v["median"] for k, v in township_type_stats.items()}

    city_median = df["city"].map(city_med_map).fillna(global_median)
    township_median = df["township_key"].map(township_med_map).fillna(city_median)
    township_type_median = df["township_type_key"].map(tt_med_map).fillna(township_median)

    return pd.DataFrame(
        {
            "city_code": df["city"].map(city_categories).astype(float),
            "township_code": df["township_key"].map(township_categories).fillna(-1).astype(float),
            "btype_code": df["building_type"].map(btype_categories).astype(float),
            "building_pings": df["building_pings"].astype(float),
            "building_age": df["building_age"].astype(float),
            "time_index": df["time_index"].astype(float),
            "city_median": city_median.astype(float),
            "township_median": township_median.astype(float),
            "township_type_median": township_type_median.astype(float),
        }
    )


def main():
    engine = create_engine(DB_URL)
    df = fetch_training_dataframe(engine)
    if df.empty:
        raise RuntimeError("查無可用訓練資料，請先確認 housing_data_clean 資料表。")

    df["city"] = df["city"].astype(str).str.strip()
    df["township"] = df["township"].astype(str).str.strip()
    df["building_type"] = df["building_state"].map(normalize_building_type)
    df["township_key"] = df["city"] + "|" + df["township"]
    df["township_type_key"] = df["township_key"] + "|" + df["building_type"]
    df["time_index"] = (df["year"] - 101) * 4 + df["season"]

    # 限制屋齡異常值，保留 NaN 讓 HistGradientBoosting 原生處理
    df.loc[(df["building_age"] < 0) | (df["building_age"] > 90), "building_age"] = np.nan

    latest_time_index = int(df["time_index"].max())
    latest_row = df.loc[df["time_index"] == latest_time_index, ["year", "season"]].iloc[0]
    latest_quarter = f"{int(latest_row['year'])}-Q{int(latest_row['season'])}"

    # 以最新一季作為時間序驗證集（Out-of-Time Validation），確保評估貼近真實預測表現
    val_mask = df["time_index"] == latest_time_index
    train_df = df.loc[~val_mask].copy()
    val_df = df.loc[val_mask].copy()

    if len(val_df) < 5_000:
        # 若最新一季筆數過少，改採最後兩季作為驗證
        val_mask = df["time_index"] >= latest_time_index - 1
        train_df = df.loc[~val_mask].copy()
        val_df = df.loc[val_mask].copy()

    # 若訓練集超過上限，進行均勻隨機抽樣（時間權重交由模型 fit 的 sample_weight 處理）
    if len(train_df) > MAX_TRAIN_SAMPLES:
        train_df = train_df.sample(n=MAX_TRAIN_SAMPLES, random_state=42)

    print(
        f"[ML Train] 訓練集：{len(train_df):,} 筆｜時間序驗證集（{latest_quarter}）：{len(val_df):,} 筆"
    )

    # 計算類別編碼與目標統計
    city_categories = {c: idx for idx, c in enumerate(sorted(df["city"].unique()))}
    township_categories = {tk: idx for idx, tk in enumerate(sorted(df["township_key"].unique()))}
    btype_categories = {bt: idx for idx, bt in enumerate(STANDARD_BUILDING_TYPES)}

    # 驗證階段：只用 train_df 統計避免洩漏
    g_med_tr, c_stats_tr, t_stats_tr, tt_stats_tr = build_smoothed_stats(train_df)

    X_train = encode_features(
        train_df, city_categories, township_categories, btype_categories,
        g_med_tr, c_stats_tr, t_stats_tr, tt_stats_tr,
    )
    y_train = np.log1p(train_df["unit_price_per_ping"].to_numpy(dtype=float))

    X_val = encode_features(
        val_df, city_categories, township_categories, btype_categories,
        g_med_tr, c_stats_tr, t_stats_tr, tt_stats_tr,
    )
    y_val_raw = val_df["unit_price_per_ping"].to_numpy(dtype=float)
    y_val_log = np.log1p(y_val_raw)

    # 對訓練資料給予溫和的時間遞增權重
    sample_weights = np.power(1.06, train_df["time_index"].to_numpy(dtype=float) - float(train_df["time_index"].min()))

    print("[ML Train] 正在訓練驗證模型 (HistGradientBoostingRegressor)...")
    t_fit = time.time()
    val_model = HistGradientBoostingRegressor(
        loss="squared_error",
        learning_rate=0.06,
        max_iter=260,
        max_leaf_nodes=63,
        min_samples_leaf=40,
        l2_regularization=1.0,
        categorical_features=[0, 2],
        random_state=42,
    )
    val_model.fit(X_train, y_train, sample_weight=sample_weights)
    print(f"[ML Train] 驗證模型訓練完成（耗時 {time.time() - t_fit:.1f}s）")

    val_pred_log = val_model.predict(X_val)
    val_pred_raw = np.expm1(val_pred_log)

    r2 = float(r2_score(y_val_raw, val_pred_raw))
    mae = float(mean_absolute_error(y_val_raw, val_pred_raw))
    mape = float(np.mean(np.abs(y_val_raw - val_pred_raw) / np.clip(y_val_raw, 1.0, None)) * 100.0)

    # 以時間序驗證殘差校準 15% ~ 85% 合理行情區間
    log_residuals = y_val_log - val_pred_log
    residual_q15 = float(np.quantile(log_residuals, 0.15))
    residual_q85 = float(np.quantile(log_residuals, 0.85))

    print(
        f"[ML Train] Out-of-Time 驗證指標（{latest_quarter}）："
        f"R² = {r2:.4f} | MAE = {mae:.2f} 萬/坪 | MAPE = {mape:.2f}% | "
        f"q15={residual_q15:.3f}, q85={residual_q85:.3f}"
    )

    # 最後使用含最新一季的完整近代資料重訓最終上線模型，讓線上推論涵蓋最新行情
    full_df = df.copy()
    if len(full_df) > MAX_TRAIN_SAMPLES:
        full_df = full_df.sample(n=MAX_TRAIN_SAMPLES, random_state=42)

    g_med_full, c_stats_full, t_stats_full, tt_stats_full = build_smoothed_stats(full_df)
    X_full = encode_features(
        full_df, city_categories, township_categories, btype_categories,
        g_med_full, c_stats_full, t_stats_full, tt_stats_full,
    )
    y_full = np.log1p(full_df["unit_price_per_ping"].to_numpy(dtype=float))
    full_sample_weights = np.power(
        1.06, full_df["time_index"].to_numpy(dtype=float) - float(full_df["time_index"].min())
    )

    print("[ML Train] 正在訓練最終上線模型（含最新季度資料）...")
    t_final = time.time()
    final_model = HistGradientBoostingRegressor(
        loss="squared_error",
        learning_rate=0.06,
        max_iter=260,
        max_leaf_nodes=63,
        min_samples_leaf=40,
        l2_regularization=1.0,
        categorical_features=[0, 2],
        random_state=42,
    )
    final_model.fit(X_full, y_full, sample_weight=full_sample_weights)
    print(f"[ML Train] 最終模型訓練完成（耗時 {time.time() - t_final:.1f}s）")

    artifact = {
        "model_name": "HistGradientBoostingRegressor (Log-Price GBDT)",
        "model": final_model,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "latest_quarter": latest_quarter,
        "latest_time_index": latest_time_index,
        "training_rows": int(len(full_df)),
        "global_median": g_med_full,
        "city_stats": c_stats_full,
        "township_stats": t_stats_full,
        "township_type_stats": tt_stats_full,
        "city_categories": city_categories,
        "township_categories": township_categories,
        "btype_categories": btype_categories,
        "supported_building_types": STANDARD_BUILDING_TYPES,
        "residual_q15": residual_q15,
        "residual_q85": residual_q85,
        "metrics": {
            "r2": round(r2, 4),
            "mae_wan_per_ping": round(mae, 2),
            "mape_pct": round(mape, 2),
            "validation_quarter": latest_quarter,
            "validation_rows": int(len(val_df)),
        },
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, MODEL_PATH, compress=3)
    size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
    print(f"[ML Train] 模型已儲存至 {MODEL_PATH}（大小 {size_mb:.2f} MB）")


if __name__ == "__main__":
    main()
