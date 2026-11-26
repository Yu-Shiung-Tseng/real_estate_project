import os
import threading
import time
from collections import OrderedDict
from typing import Any, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text

from ml_engine import ValuationModelService, forecast_quarterly_trend

app = FastAPI(title="台灣房價儀表板 API")

# ==========================================
# 1. 安全 CORS 設定（限縮允許來源，防止第三方網站濫用）
# ==========================================
DEFAULT_ALLOWED_ORIGINS = [
    "https://doban.uk",
    "https://www.doban.uk",
    "http://localhost",
    "http://localhost:80",
    "http://localhost:5173",
    "http://127.0.0.1",
]
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] or DEFAULT_ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

load_dotenv()
DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin123@localhost:5433/real_estate")

if not DB_URL:
    raise ValueError("⚠️ 環境變數 DATABASE_URL 尚未設定！請檢查 .env 檔或環境設定。")

engine = create_engine(DB_URL, pool_pre_ping=True, pool_size=10, max_overflow=15)
valuation_service = ValuationModelService()


# ==========================================
# 2. 執行緒安全的記憶體 TTL 快取（每季更新一次的統計資料非常適合快取）
# ==========================================
class BoundedTTLCache:
    def __init__(self, max_size: int = 512, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._store: OrderedDict[Any, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Any) -> Optional[Any]:
        now = time.monotonic()
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            expires_at, value = item
            if now >= expires_at:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return value

    def set(self, key: Any, value: Any) -> None:
        expires_at = time.monotonic() + self.ttl_seconds
        with self._lock:
            self._store[key] = (expires_at, value)
            self._store.move_to_end(key)
            while len(self._store) > self.max_size:
                self._store.popitem(last=False)


api_cache = BoundedTTLCache(max_size=512, ttl_seconds=3600)


class PricePredictRequest(BaseModel):
    city: str = Field(..., min_length=1, description="縣市名稱，例如 臺中市")
    district: Optional[str] = Field("all", description="行政區名稱或 all")
    building_type: str = Field("住宅大樓", description="建物型態")
    building_pings: float = Field(..., gt=0, le=500, description="建物坪數")
    building_age: Optional[float] = Field(None, ge=0, le=100, description="屋齡（年），可為空")
    parking_price: float = Field(0.0, ge=0, le=5000, description="車位總價（萬元）")


@app.get("/api/districts")
def get_districts(city: str):
    """根據精確的 city 欄位回傳行政區清單"""
    city_clean = city.strip()
    cache_key = ("districts", city_clean)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    query = """
        SELECT DISTINCT township
        FROM housing_data_clean
        WHERE city = :city AND township IS NOT NULL
        ORDER BY township
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), {"city": city_clean})
        data = [row[0] for row in result if row[0]]
    api_cache.set(cache_key, data)
    return data


def build_filter_query(
    city: Optional[str],
    district: Optional[str],
    min_price: Optional[float],
    max_price: Optional[float],
    min_age: Optional[float],
    max_age: Optional[float],
    building_types: List[str],
    min_date: Optional[str] = None,
    max_date: Optional[str] = None,
    prefix: str = "",
):
    """統一處理過濾條件，使用精確的 city / township 欄位並善用索引"""
    filters = [
        f"{prefix}is_special_transaction = FALSE",
        f"{prefix}transaction_western_date IS NOT NULL",
    ]
    params = {}

    if city:
        filters.append(f"{prefix}city = :city")
        params["city"] = city.strip()
    if district and district.strip() != "all":
        filters.append(f"{prefix}township = :district")
        params["district"] = district.strip()
    if min_price is not None:
        filters.append(f"{prefix}unit_price_per_ping >= :min_price")
        params["min_price"] = min_price
    if max_price is not None:
        filters.append(f"{prefix}unit_price_per_ping <= :max_price")
        params["max_price"] = max_price
    if min_age is not None:
        filters.append(f"{prefix}building_age_at_transaction >= :min_age")
        params["min_age"] = min_age
    if max_age is not None:
        filters.append(f"{prefix}building_age_at_transaction <= :max_age")
        params["max_age"] = max_age
    if building_types:
        type_conditions = []
        for i, b_type in enumerate(building_types):
            param_name = f"btype_{i}"
            type_conditions.append(f"{prefix}building_state LIKE :{param_name}")
            params[param_name] = f"%{b_type}%"
        filters.append(f"({' OR '.join(type_conditions)})")
    if min_date:
        filters.append(f"{prefix}transaction_western_date >= TO_DATE(:min_date, 'YYYY-MM')")
        params["min_date"] = min_date
    if max_date:
        filters.append(f"{prefix}transaction_western_date < TO_DATE(:max_date, 'YYYY-MM') + INTERVAL '1 month'")
        params["max_date"] = max_date

    return " AND ".join(filters), params


@app.get("/api/stats")
def get_stats(
    city: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_age: Optional[float] = None,
    max_age: Optional[float] = None,
    min_date: Optional[str] = None,
    max_date: Optional[str] = None,
    building_types: List[str] = Query(None),
):
    btypes_key = tuple(sorted(building_types)) if building_types else ()
    cache_key = ("stats", city, district, min_price, max_price, min_age, max_age, min_date, max_date, btypes_key)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    where_clause, params = build_filter_query(
        city, district, min_price, max_price, min_age, max_age, building_types, min_date, max_date
    )
    query = (
        "SELECT COUNT(*) as total_count, "
        "COALESCE(ROUND(AVG(unit_price_per_ping), 2), 0) as avg_price, "
        "COALESCE(ROUND(AVG(building_pings), 2), 0) as avg_pings, "
        "COALESCE(ROUND(SUM(total_price) / 100000000, 2), 0) as total_amount_yi, "
        "COALESCE(ROUND(AVG(building_age_at_transaction), 1), 0) as avg_age "
        f"FROM housing_data_clean WHERE {where_clause}"
    )
    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings().first()
        data = dict(result) if result else {}
    api_cache.set(cache_key, data)
    return data


@app.get("/api/trends")
def get_trends(
    city: str,
    district: Optional[str] = None,
    min_age: Optional[float] = None,
    max_age: Optional[float] = None,
    min_date: Optional[str] = None,
    max_date: Optional[str] = None,
    building_types: List[str] = Query(None),
):
    btypes_key = tuple(sorted(building_types)) if building_types else ()
    cache_key = ("trends", city, district, min_age, max_age, min_date, max_date, btypes_key)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    dist_where, dist_params = build_filter_query(
        city, district, None, None, min_age, max_age, building_types, min_date, max_date, prefix="t."
    )
    city_where, city_params = build_filter_query(
        city, None, None, None, min_age, max_age, building_types, min_date, max_date, prefix="c."
    )
    query = f"""
        WITH district_trend AS (
            SELECT
                year, season,
                ROUND(AVG(unit_price_per_ping), 2) as avg_price,
                COUNT(*) as volume
            FROM housing_data_clean t
            WHERE {dist_where}
              AND t.year BETWEEN 101 AND 125
              AND t.season BETWEEN 1 AND 4
            GROUP BY year, season
        ),
        city_trend AS (
            SELECT
                year, season,
                ROUND(AVG(unit_price_per_ping), 2) as avg_price,
                COUNT(*) as volume
            FROM housing_data_clean c
            WHERE {city_where}
              AND c.year BETWEEN 101 AND 125
              AND c.season BETWEEN 1 AND 4
            GROUP BY year, season
        )
        SELECT
            d.year, d.season,
            d.avg_price as district_avg,
            d.volume as district_volume,
            c.avg_price as city_avg,
            c.volume as city_volume
        FROM district_trend d
        JOIN city_trend c ON d.year = c.year AND d.season = c.season
        ORDER BY d.year, d.season
    """
    with engine.connect() as conn:
        all_params = {**dist_params, **city_params}
        result = conn.execute(text(query), all_params).mappings().all()
        data = [dict(row) for row in result]
    api_cache.set(cache_key, data)
    return data


@app.get("/api/transactions")
def get_transactions(
    city: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_age: Optional[float] = None,
    max_age: Optional[float] = None,
    min_date: Optional[str] = None,
    max_date: Optional[str] = None,
    building_types: List[str] = Query(None),
    limit: int = Query(1000, ge=1, le=2000),
):
    """回傳最新成交明細（加上 LIMIT 防護，避免單次請求輸出數萬筆打爆頻寬與記憶體）"""
    where_clause, params = build_filter_query(
        city, district, min_price, max_price, min_age, max_age, building_types, min_date, max_date
    )
    params["limit"] = limit
    query = (
        "SELECT transaction_western_date, address, building_state, total_price, "
        "unit_price_per_ping, building_pings, building_age_at_transaction "
        f"FROM housing_data_clean WHERE {where_clause} "
        "ORDER BY transaction_western_date DESC LIMIT :limit"
    )
    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings().all()
        return [dict(row) for row in result]


@app.get("/api/map-data")
def get_map_data(
    city: str = "all",
    mode: str = "price",
    min_date: Optional[str] = None,
    max_date: Optional[str] = None,
    min_age: Optional[float] = None,
    max_age: Optional[float] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    building_types: List[str] = Query(None),
):
    """熱力圖 API：支援全台或單一縣市，並根據篩選條件動態計算 100% 基準線。"""
    btypes_key = tuple(sorted(building_types)) if building_types else ()
    cache_key = ("map_data", city, mode, min_date, max_date, min_age, max_age, min_price, max_price, btypes_key)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    where_clauses = ["township IS NOT NULL", "is_special_transaction = FALSE"]
    params = {}

    if city and city != "all":
        where_clauses.append("city = :city")
        params["city"] = city.strip()

    if min_price is not None:
        where_clauses.append("unit_price_per_ping >= :min_price")
        params["min_price"] = min_price
    if max_price is not None:
        where_clauses.append("unit_price_per_ping <= :max_price")
        params["max_price"] = max_price
    if min_age is not None:
        where_clauses.append("building_age_at_transaction >= :min_age")
        params["min_age"] = min_age
    if max_age is not None:
        where_clauses.append("building_age_at_transaction <= :max_age")
        params["max_age"] = max_age
    if min_date:
        where_clauses.append("transaction_western_date >= TO_DATE(:min_date, 'YYYY-MM')")
        params["min_date"] = min_date
    if max_date:
        where_clauses.append("transaction_western_date < TO_DATE(:max_date, 'YYYY-MM') + INTERVAL '1 month'")
        params["max_date"] = max_date
    if building_types:
        type_conds = []
        for i, b_type in enumerate(building_types):
            param_key = f"map_btype_{i}"
            type_conds.append(f"building_state LIKE :{param_key}")
            params[param_key] = f"%{b_type}%"
        where_clauses.append(f"({' OR '.join(type_conds)})")

    where_sql = " AND ".join(where_clauses)

    if mode == "price":
        value_sql = "ROUND(CAST(ds.d_avg AS numeric) / NULLIF(CAST(tb.avg_val AS numeric), 0) * 100, 2)"
    else:
        value_sql = "ROUND(CAST(ds.d_vol AS numeric) / NULLIF(CAST(tb.avg_vol AS numeric), 0) * 100, 2)"

    query = f"""
        WITH filtered_data AS (
            SELECT * FROM housing_data_clean WHERE {where_sql}
        ),
        target_benchmark AS (
            SELECT
                AVG(unit_price_per_ping) as avg_val,
                COUNT(*)::float / NULLIF(COUNT(DISTINCT (city || township)), 0) as avg_vol
            FROM filtered_data
        ),
        districts_stats AS (
            SELECT
                (city || township) as full_name,
                AVG(unit_price_per_ping) as d_avg,
                COUNT(*) as d_vol
            FROM filtered_data
            GROUP BY city, township
        )
        SELECT
            TRIM(REPLACE(full_name, '臺', '台')) as name,
            {value_sql} as value,
            ds.d_vol as actual_count
        FROM districts_stats ds CROSS JOIN target_benchmark tb
    """

    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings().all()
        data = [dict(row) for row in result]
    api_cache.set(cache_key, data)
    return data


# ==========================================
# 3. 機器學習 API：走勢預測 + 單戶 AI 估價
# ==========================================
@app.get("/api/ml/model-info")
def get_ml_model_info():
    """回傳目前線上 AI 估價模型的訓練資訊與驗證指標。"""
    return valuation_service.get_info()


@app.get("/api/ml/forecast")
def get_price_forecast(
    city: str,
    district: Optional[str] = None,
    min_age: Optional[float] = None,
    max_age: Optional[float] = None,
    max_date: Optional[str] = None,
    building_types: List[str] = Query(None),
    horizon: int = Query(4, ge=1, le=8),
):
    """依據歷史季度實價登錄走勢，預測未來 1~8 季單價走勢與 80% 信心區間。"""
    btypes_key = tuple(sorted(building_types)) if building_types else ()
    cache_key = ("ml_forecast", city, district, min_age, max_age, max_date, btypes_key, horizon)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    dist_where, dist_params = build_filter_query(
        city, district, None, None, min_age, max_age, building_types, None, max_date, prefix="t."
    )
    city_where, city_params = build_filter_query(
        city, None, None, None, min_age, max_age, building_types, None, max_date, prefix="c."
    )
    query = f"""
        WITH district_trend AS (
            SELECT
                year, season,
                ROUND(AVG(unit_price_per_ping), 2) AS avg_price,
                COUNT(*) AS volume
            FROM housing_data_clean t
            WHERE {dist_where}
              AND t.year BETWEEN 101 AND 125
              AND t.season BETWEEN 1 AND 4
            GROUP BY year, season
        ),
        city_trend AS (
            SELECT
                year, season,
                ROUND(AVG(unit_price_per_ping), 2) AS avg_price,
                COUNT(*) AS volume
            FROM housing_data_clean c
            WHERE {city_where}
              AND c.year BETWEEN 101 AND 125
              AND c.season BETWEEN 1 AND 4
            GROUP BY year, season
        )
        SELECT
            d.year, d.season,
            d.avg_price AS district_avg,
            d.volume AS district_volume,
            c.avg_price AS city_avg,
            c.volume AS city_volume
        FROM district_trend d
        JOIN city_trend c ON d.year = c.year AND d.season = c.season
        ORDER BY d.year, d.season
    """
    with engine.connect() as conn:
        all_params = {**dist_params, **city_params}
        rows = [dict(row) for row in conn.execute(text(query), all_params).mappings().all()]

    use_district = bool(district and district.strip() != "all")
    data = forecast_quarterly_trend(rows, horizon=horizon, use_district=use_district)
    api_cache.set(cache_key, data)
    return data


@app.post("/api/ml/predict-price")
def predict_property_price(payload: PricePredictRequest):
    """使用離線訓練之 HistGradientBoosting 模型估算單戶合理單價與總價區間。"""
    try:
        return valuation_service.predict(
            city=payload.city,
            district=payload.district,
            building_type=payload.building_type,
            building_pings=payload.building_pings,
            building_age=payload.building_age,
            parking_price=payload.parking_price,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# ==========================================
# 4. 預售屋解約潮 & 交屋後 3~5 年賣壓觀察 API
# ==========================================
def _format_roc_date(raw_val: Optional[str]) -> str:
    if not raw_val:
        return "-"
    s = str(raw_val).strip()
    if len(s) >= 7 and s[:7].isdigit():
        roc_y = int(s[:3])
        return f"{roc_y + 1911}-{s[3:5]}-{s[5:7]}"
    return s


@app.get("/api/risk/presale-cancellations")
def get_presale_cancellations(city: str = "all"):
    """
    統計內政部實價登錄公開之預售屋解約案件（來自 raw_housing_data.cancel_status）。
    善用部分索引 idx_raw_presale_cancel 達成毫秒級查詢。
    """
    city_clean = city.strip() if city else "all"
    cache_key = ("risk_presale_cancel", city_clean)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    where_parts = ["cancel_status IS NOT NULL", "TRIM(cancel_status) <> ''"]
    params: dict[str, Any] = {}
    if city_clean != "all":
        where_parts.append("city = :city")
        params["city"] = city_clean
    where_sql = " AND ".join(where_parts)

    summary_sql = f"""
        SELECT
            COUNT(*) AS total_cancellations,
            COUNT(DISTINCT NULLIF(TRIM(project_name), '')) AS affected_projects,
            COALESCE(ROUND(SUM(total_price) / 100000000.0, 2), 0) AS total_amount_yi,
            COALESCE(ROUND(AVG(total_price) / 10000.0, 1), 0) AS avg_total_price_wan,
            MAX(CASE WHEN cancel_status ~ '^[0-9]{{7}}' THEN SUBSTRING(cancel_status FROM 1 FOR 7) END) AS latest_cancel_roc
        FROM raw_housing_data
        WHERE {where_sql}
    """

    trend_sql = f"""
        SELECT
            CAST(SUBSTRING(cancel_status FROM 1 FOR 3) AS INT) AS cancel_year,
            ((CAST(SUBSTRING(cancel_status FROM 4 FOR 2) AS INT) - 1) / 3 + 1) AS cancel_season,
            COUNT(*) AS count,
            COALESCE(ROUND(SUM(total_price) / 100000000.0, 2), 0) AS total_amount_yi
        FROM raw_housing_data
        WHERE {where_sql}
          AND cancel_status ~ '^[0-9]{{7}}'
        GROUP BY 1, 2
        ORDER BY 1, 2
    """

    group_col = "city" if city_clean == "all" else "township"
    ranking_sql = f"""
        SELECT
            COALESCE(NULLIF(TRIM({group_col}), ''), '未標示') AS area_name,
            COUNT(*) AS count,
            COUNT(DISTINCT NULLIF(TRIM(project_name), '')) AS projects,
            COALESCE(ROUND(SUM(total_price) / 100000000.0, 2), 0) AS total_amount_yi
        FROM raw_housing_data
        WHERE {where_sql}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 12
    """

    projects_sql = f"""
        SELECT
            city,
            COALESCE(township, '') AS township,
            TRIM(project_name) AS project_name,
            COUNT(*) AS cancel_count,
            COALESCE(ROUND(AVG(total_price) / 10000.0, 1), 0) AS avg_total_price_wan,
            MAX(CASE WHEN cancel_status ~ '^[0-9]{{7}}' THEN SUBSTRING(cancel_status FROM 1 FOR 7) END) AS latest_cancel_roc
        FROM raw_housing_data
        WHERE {where_sql}
          AND project_name IS NOT NULL
          AND TRIM(project_name) <> ''
        GROUP BY city, township, TRIM(project_name)
        ORDER BY cancel_count DESC, avg_total_price_wan DESC
        LIMIT 15
    """

    recent_sql = f"""
        SELECT
            city,
            COALESCE(township, '') AS township,
            COALESCE(NULLIF(TRIM(project_name), ''), '未登載建案名稱') AS project_name,
            transaction_date,
            cancel_status,
            COALESCE(ROUND(total_price / 10000.0, 1), 0) AS total_price_wan
        FROM raw_housing_data
        WHERE {where_sql}
        ORDER BY
            CASE WHEN cancel_status ~ '^[0-9]{{7}}' THEN SUBSTRING(cancel_status FROM 1 FOR 7) ELSE '0000000' END DESC,
            id DESC
        LIMIT 100
    """

    with engine.connect() as conn:
        s_row = dict(conn.execute(text(summary_sql), params).mappings().first() or {})
        trend_rows = [dict(r) for r in conn.execute(text(trend_sql), params).mappings().all()]
        ranking_rows = [dict(r) for r in conn.execute(text(ranking_sql), params).mappings().all()]
        project_rows = [dict(r) for r in conn.execute(text(projects_sql), params).mappings().all()]
        recent_rows = [dict(r) for r in conn.execute(text(recent_sql), params).mappings().all()]

    for r in trend_rows:
        r["label"] = f"{r['cancel_year']}-Q{r['cancel_season']}"
        r["total_amount_yi"] = float(r["total_amount_yi"] or 0)

    for r in ranking_rows:
        r["total_amount_yi"] = float(r["total_amount_yi"] or 0)

    for r in project_rows:
        r["avg_total_price_wan"] = float(r["avg_total_price_wan"] or 0)
        r["latest_cancel_date"] = _format_roc_date(r.pop("latest_cancel_roc", None))

    formatted_recent = []
    for r in recent_rows:
        raw_cs = str(r.get("cancel_status") or "").strip()
        cancel_date = _format_roc_date(raw_cs[:7]) if len(raw_cs) >= 7 and raw_cs[:7].isdigit() else "-"
        cancel_type = raw_cs[7:] if len(raw_cs) > 7 and raw_cs[:7].isdigit() else raw_cs
        formatted_recent.append(
            {
                "city": r["city"],
                "township": r["township"],
                "project_name": r["project_name"],
                "contract_date": _format_roc_date(r.get("transaction_date")),
                "cancel_date": cancel_date,
                "cancel_type": cancel_type or "解約",
                "total_price_wan": float(r["total_price_wan"] or 0),
            }
        )

    payload = {
        "city": city_clean,
        "summary": {
            "total_cancellations": int(s_row.get("total_cancellations") or 0),
            "affected_projects": int(s_row.get("affected_projects") or 0),
            "total_amount_yi": float(s_row.get("total_amount_yi") or 0),
            "avg_total_price_wan": float(s_row.get("avg_total_price_wan") or 0),
            "latest_cancel_date": _format_roc_date(s_row.get("latest_cancel_roc")),
        },
        "quarterly_trend": trend_rows,
        "area_ranking": ranking_rows,
        "top_projects": project_rows,
        "recent_records": formatted_recent,
    }
    api_cache.set(cache_key, payload)
    return payload


@app.get("/api/risk/grace-period-pressure")
def get_grace_period_pressure(city: str = "all"):
    """
    間接觀測「交屋後 3~5 年（寬限期屆滿窗口）」新建案成屋轉手賣壓與折價讓利比例。
    以屋齡 2.5~5.5 年且單價低於同區同屋齡均價 85% 作為讓利／急售參考指標。
    """
    city_clean = city.strip() if city else "all"
    cache_key = ("risk_grace_pressure", city_clean)
    cached = api_cache.get(cache_key)
    if cached is not None:
        return cached

    city_filter = ""
    params: dict[str, Any] = {}
    if city_clean != "all":
        city_filter = "AND city = :city"
        params["city"] = city_clean

    trend_sql = f"""
        SELECT
            year,
            season,
            COUNT(*) AS total_count,
            COUNT(*) FILTER (WHERE building_age_at_transaction BETWEEN 2.5 AND 5.5) AS age3_5_count,
            COALESCE(
                ROUND(AVG(unit_price_per_ping) FILTER (WHERE building_age_at_transaction BETWEEN 2.5 AND 5.5), 2),
                0
            ) AS age3_5_avg_price
        FROM housing_data_clean
        WHERE is_special_transaction = FALSE
          AND transaction_western_date IS NOT NULL
          AND year BETWEEN 111 AND 125
          AND season BETWEEN 1 AND 4
          {city_filter}
        GROUP BY year, season
        ORDER BY year, season
    """

    group_cols = "city, township" if city_clean != "all" else "city, township"
    min_area_cnt = 15 if city_clean == "all" else 5
    hotspot_sql = f"""
        WITH latest_q AS (
            SELECT MAX(year * 4 + season) AS max_q
            FROM housing_data_clean
            WHERE is_special_transaction = FALSE AND year BETWEEN 111 AND 125 AND season BETWEEN 1 AND 4
        ),
        recent_new AS (
            SELECT
                city,
                township,
                unit_price_per_ping
            FROM housing_data_clean, latest_q
            WHERE is_special_transaction = FALSE
              AND building_age_at_transaction BETWEEN 2.5 AND 5.5
              AND (year * 4 + season) >= (latest_q.max_q - 3)
              AND township IS NOT NULL
              AND unit_price_per_ping > 0
              {city_filter}
        ),
        area_avg AS (
            SELECT
                city,
                township,
                AVG(unit_price_per_ping) AS avg_p,
                COUNT(*) AS cnt
            FROM recent_new
            GROUP BY {group_cols}
        )
        SELECT
            r.city,
            r.township,
            a.cnt AS volume_4q,
            ROUND(a.avg_p, 2) AS avg_price,
            COUNT(*) FILTER (WHERE r.unit_price_per_ping < a.avg_p * 0.85) AS discount_count,
            ROUND(
                COUNT(*) FILTER (WHERE r.unit_price_per_ping < a.avg_p * 0.85)::numeric / NULLIF(a.cnt, 0) * 100,
                1
            ) AS discount_ratio_pct
        FROM recent_new r
        JOIN area_avg a ON r.city = a.city AND r.township = a.township
        WHERE a.cnt >= {min_area_cnt}
        GROUP BY r.city, r.township, a.cnt, a.avg_p
        ORDER BY volume_4q DESC, discount_ratio_pct DESC
        LIMIT 12
    """

    with engine.connect() as conn:
        trend_rows = [dict(r) for r in conn.execute(text(trend_sql), params).mappings().all()]
        hotspot_rows = [dict(r) for r in conn.execute(text(hotspot_sql), params).mappings().all()]

    for r in trend_rows:
        total_c = int(r["total_count"] or 0)
        a_c = int(r["age3_5_count"] or 0)
        r["label"] = f"{r['year']}-Q{r['season']}"
        r["share_pct"] = round((a_c / total_c * 100.0), 2) if total_c > 0 else 0.0
        r["age3_5_avg_price"] = float(r["age3_5_avg_price"] or 0)

    for r in hotspot_rows:
        r["avg_price"] = float(r["avg_price"] or 0)
        r["discount_ratio_pct"] = float(r["discount_ratio_pct"] or 0)

    recent_4 = trend_rows[-4:] if len(trend_rows) >= 4 else trend_rows
    recent_4q_count = sum(int(r["age3_5_count"] or 0) for r in recent_4)
    recent_4q_total = sum(int(r["total_count"] or 0) for r in recent_4)
    recent_4q_share = round((recent_4q_count / recent_4q_total * 100.0), 2) if recent_4q_total > 0 else 0.0

    qoq_change_pct = 0.0
    if len(trend_rows) >= 2:
        prev_c = int(trend_rows[-2]["age3_5_count"] or 0)
        curr_c = int(trend_rows[-1]["age3_5_count"] or 0)
        if prev_c > 0:
            qoq_change_pct = round(((curr_c - prev_c) / prev_c) * 100.0, 1)

    total_hotspot_vol = sum(int(r["volume_4q"] or 0) for r in hotspot_rows)
    total_hotspot_disc = sum(int(r["discount_count"] or 0) for r in hotspot_rows)
    avg_discount_ratio = round((total_hotspot_disc / total_hotspot_vol * 100.0), 1) if total_hotspot_vol > 0 else 0.0

    payload = {
        "city": city_clean,
        "summary": {
            "recent_4q_count": recent_4q_count,
            "recent_4q_share_pct": recent_4q_share,
            "qoq_change_pct": qoq_change_pct,
            "avg_discount_ratio_pct": avg_discount_ratio,
            "latest_quarter": trend_rows[-1]["label"] if trend_rows else "-",
        },
        "quarterly_trend": trend_rows,
        "hotspot_districts": hotspot_rows,
    }
    api_cache.set(cache_key, payload)
    return payload
