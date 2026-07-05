import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from typing import List, Optional

app = FastAPI(title="Real Estate AI API")

# 啟用 CORS 供 React 前端存取
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin123@localhost:5433/real_estate")

if not DB_URL:
    raise ValueError("⚠️ 環境變數 DATABASE_URL 尚未設定！請檢查 .env 檔或 Render 雲端設定。")

engine = create_engine(DB_URL)

@app.get("/api/districts")
def get_districts(city: str):
    """根據精確的 city 欄位回傳行政區清單"""
    query = """
        SELECT DISTINCT township 
        FROM housing_data_clean 
        WHERE city = :city AND township IS NOT NULL
        ORDER BY township
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), {"city": city})
        return [row[0] for row in result if row[0]]

def build_filter_query(
    city: Optional[str], district: Optional[str], min_price: Optional[float], 
    max_price: Optional[float], min_age: Optional[int], max_age: Optional[int], 
    building_types: List[str], min_date: Optional[str] = None, max_date: Optional[str] = None,
    prefix: str = ""
):
    """統一處理過濾條件，使用精確的 city 欄位"""
    filters = [
        f"{prefix}is_special_transaction = FALSE",
        f"{prefix}transaction_western_date IS NOT NULL"
    ]
    params = {}

    if city:
        # ⚠️ 修正：從 LIKE 改為精確等於
        filters.append(f"{prefix}city = :city")
        params["city"] = city
    if district and district != "all":
        filters.append(f"{prefix}township = :district")
        params["district"] = district
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
        filters.append(f"TO_CHAR({prefix}transaction_western_date, 'YYYY-MM') >= :min_date")
        params["min_date"] = min_date
    if max_date:
        filters.append(f"TO_CHAR({prefix}transaction_western_date, 'YYYY-MM') <= :max_date")
        params["max_date"] = max_date

    return " AND ".join(filters), params

# --- stats, trends, transactions 路由共用 build_filter_query，不需額外大改 ---

@app.get("/api/stats")
def get_stats(
    city: Optional[str] = None, district: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    min_age: Optional[int] = None, max_age: Optional[int] = None,
    min_date: Optional[str] = None, max_date: Optional[str] = None,
    building_types: List[str] = Query(None)
):
    where_clause, params = build_filter_query(city, district, min_price, max_price, min_age, max_age, building_types, min_date, max_date)
    query = f"SELECT COUNT(*) as total_count, COALESCE(ROUND(AVG(unit_price_per_ping), 2), 0) as avg_price, COALESCE(ROUND(AVG(building_pings), 2), 0) as avg_pings, COALESCE(ROUND(SUM(total_price) / 100000000, 2), 0) as total_amount_yi, COALESCE(ROUND(AVG(building_age_at_transaction), 1), 0) as avg_age FROM housing_data_clean WHERE {where_clause}"
    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings().first()
        return dict(result) if result else {}

@app.get("/api/trends")
def get_trends(
    city: str, district: Optional[str] = None,
    min_date: Optional[str] = None, max_date: Optional[str] = None,
    building_types: List[str] = Query(None)
):
    dist_where, dist_params = build_filter_query(city, district, None, None, None, None, building_types, min_date, max_date, prefix="t.")
    city_where, city_params = build_filter_query(city, None, None, None, None, None, building_types, min_date, max_date, prefix="c.")
    query = f"""
        WITH district_trend AS (
            SELECT 
                year, season, 
                ROUND(AVG(unit_price_per_ping), 2) as avg_price,
                COUNT(*) as volume  
            FROM housing_data_clean t WHERE {dist_where} GROUP BY year, season
        ),
        city_trend AS (
            SELECT 
                year, season, 
                ROUND(AVG(unit_price_per_ping), 2) as avg_price,
                COUNT(*) as volume  
            FROM housing_data_clean c WHERE {city_where} GROUP BY year, season
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
        return [dict(row) for row in result]

@app.get("/api/transactions")
def get_transactions(
    city: Optional[str] = None, district: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    min_age: Optional[int] = None, max_age: Optional[int] = None,
    min_date: Optional[str] = None, max_date: Optional[str] = None,
    building_types: List[str] = Query(None)
):
    where_clause, params = build_filter_query(city, district, min_price, max_price, min_age, max_age, building_types, min_date, max_date)
    query = f"SELECT transaction_western_date, address, building_state, total_price, unit_price_per_ping, building_pings, building_age_at_transaction FROM housing_data_clean WHERE {where_clause} ORDER BY transaction_western_date DESC "
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
    building_types: List[str] = Query(None)
):
    """
    熱力圖 API：支援全台或單一縣市，並根據篩選條件動態計算 100% 基準線。
    """
    where_clauses = ["township IS NOT NULL", "is_special_transaction = FALSE"]
    params = {}

    if city and city != "all":
        where_clauses.append("city = :city")
        params["city"] = city

    # 綁定過濾條件
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

    # 決定計算方式
    if mode == "price":
        # 價格強度：(區域平均 / 篩選範圍縣市平均) * 100
        value_sql = "ROUND(CAST(ds.d_avg AS numeric) / NULLIF(CAST(tb.avg_val AS numeric), 0) * 100, 2)"
    else:
        # 成交熱度：(區域總量 / 篩選範圍各區平均成交量) * 100
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
        return [dict(row) for row in result]