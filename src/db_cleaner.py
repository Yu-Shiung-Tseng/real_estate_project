import psycopg2
from sqlalchemy import create_engine, text
import time

# 資料庫連線配置
DB_URL = "postgresql://admin:admin123@db:5432/real_estate"
engine = create_engine(DB_URL)

def run_incremental_clean(full_reclean=False, batch_size=10000, verification_limit=None):
    """
    執行增量清洗，將 raw_housing_data 轉換並搬運至 housing_data_clean。
    解決：1. 熱力圖縣市缺失問題  2. 屋齡計算 0 年問題  3. 排除純土地與車位交易噪點
    """
    if full_reclean:
        print("⚠️ [Warning] 正在清空 Clean Table 以執行完全重新清洗...")
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE housing_data_clean;"))

    # 計算尚未清洗的資料總數 (比對 serial_number)
    # 同時過濾掉沒有總價的垃圾資料，以及純土地/車位
    count_query = """
        SELECT COUNT(*) FROM raw_housing_data r
        WHERE NOT EXISTS (
            SELECT 1 FROM housing_data_clean c WHERE c.serial_number = r.serial_number
        ) 
        AND CAST(total_price AS TEXT) ~ '[0-9]'
        AND transaction_sign NOT IN ('土地', '車位');
    """
    
    with engine.connect() as conn:
        total_pending = conn.execute(text(count_query)).scalar()
    
    if verification_limit and total_pending > verification_limit:
        print(f"🔍 [Mode] 驗證模式開啟，僅處理前 {verification_limit} 筆資料。")
        total_pending = verification_limit

    if total_pending == 0:
        print("✅ [Skip] 資料庫已是最新狀態，無需清洗。")
        return

    print(f"🧹 [Start] 待處理資料: {total_pending:,} 筆，批次大小: {batch_size}")
    
    processed_count = 0
    start_time = time.time()

    # 分批次清洗，避免大事務造成資料庫鎖定或記憶體溢出
    while processed_count < total_pending:
        current_limit = min(batch_size, total_pending - processed_count)
        
        # ⚠️ 核心清洗 SQL
        clean_sql = f"""
        INSERT INTO housing_data_clean (
            serial_number, city, township, address, building_state, 
            transaction_western_date, total_price, unit_price_per_ping, 
            building_pings, is_special_transaction, year, season, building_age_at_transaction
        )
        SELECT 
            serial_number, 
            city,            -- ⚠️ 重要：搬運由 ETL 生成的精準縣市資料
            township, 
            address, 
            building_state, 
            
            -- 1. 西元日期轉換 (民國轉西元)
            CASE 
                WHEN CAST(transaction_date AS TEXT) ~ '^[0-9]+(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$' THEN
                    TO_DATE(
                        (CAST(SUBSTRING(CAST(transaction_date AS TEXT), 1, LENGTH(CAST(transaction_date AS TEXT))-4) AS INTEGER) + 1911)::TEXT || 
                        RIGHT(CAST(transaction_date AS TEXT), 4), 
                        'YYYYMMDD'
                    )
                ELSE NULL 
            END as transaction_western_date,
            
            -- 2. 總價 (轉數值)
            CAST(NULLIF(REGEXP_REPLACE(CAST(total_price AS TEXT), '[^0-9.]', '', 'g'), '') AS NUMERIC),
            
            -- 3. 單價轉換 (平方公尺轉坪，元轉萬元)
            ROUND((CAST(NULLIF(REGEXP_REPLACE(CAST(unit_price AS TEXT), '[^0-9.]', '', 'g'), '') AS NUMERIC) * 3.30578 / 10000), 2),
            
            -- 4. 面積轉換 (平方公尺轉坪)
            ROUND((CAST(NULLIF(REGEXP_REPLACE(CAST(building_area AS TEXT), '[^0-9.]', '', 'g'), '') AS NUMERIC) * 0.3025), 2),
            
            -- 5. 標註特殊交易 (排除異常低價/高價分析)
            CASE 
                WHEN note LIKE '%%親友%%' OR note LIKE '%%員工%%' OR note LIKE '%%急買%%' 
                     OR note LIKE '%%親屬%%' OR note LIKE '%%借名%%' THEN TRUE 
                ELSE FALSE 
            END,
            
            -- 6. 資料所屬季度
            CAST(NULLIF(REGEXP_REPLACE(CAST(year AS TEXT), '[^0-9]', '', 'g'), '') AS INTEGER),
            CAST(NULLIF(REGEXP_REPLACE(CAST(season AS TEXT), '[^0-9]', '', 'g'), '') AS INTEGER),

            -- 7. 強化版屋齡計算邏輯
            CASE 
                -- 確保兩者日期都至少有 6 碼 (例如 980101, 1120512)
                WHEN LENGTH(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g')) >= 6 
                 AND LENGTH(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g')) >= 6 
                THEN
                    CASE
                        -- (交易年 - 建築年) + (交易月 - 建築月) / 12.0
                        WHEN (
                            (CAST(LEFT(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g'), -4) AS NUMERIC) - 
                             CAST(LEFT(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g'), -4) AS NUMERIC))
                            +
                            (CAST(SUBSTRING(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g'), LENGTH(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g'))-3, 2) AS NUMERIC) - 
                             CAST(SUBSTRING(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g'), LENGTH(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g'))-3, 2) AS NUMERIC)) / 12.0
                        ) <= 0 
                        THEN 0.0 -- 🛑 修改：預售或剛蓋好即賣，設為 0.0 年
                        ELSE 
                            ROUND((
                                (CAST(LEFT(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g'), -4) AS NUMERIC) - 
                                 CAST(LEFT(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g'), -4) AS NUMERIC))
                                +
                                (CAST(SUBSTRING(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g'), LENGTH(REGEXP_REPLACE(CAST(transaction_date AS TEXT), '[^0-9]', '', 'g'))-3, 2) AS NUMERIC) - 
                                 CAST(SUBSTRING(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g'), LENGTH(REGEXP_REPLACE(CAST(construction_date AS TEXT), '[^0-9]', '', 'g'))-3, 2) AS NUMERIC)) / 12.0
                            ), 1)
                    END
                ELSE NULL  
            END as building_age_at_transaction

        FROM raw_housing_data r
        WHERE NOT EXISTS (
            SELECT 1 FROM housing_data_clean c WHERE c.serial_number = r.serial_number
        )
        AND CAST(total_price AS TEXT) ~ '[0-9]'
        -- 🛑 核心防禦：排除純土地與車位
        AND transaction_sign NOT IN ('土地', '車位')

        AND transaction_sign NOT IN ('土地', '車位')
        
        -- 🛡️ 新增：常識防護網 (排除極端錯誤數據)
        -- 1. 單價太誇張 (大於 400萬/坪 或 小於 2萬/坪 視為異常不採用)
        AND (CAST(NULLIF(REGEXP_REPLACE(CAST(unit_price AS TEXT), '[^0-9.]', '', 'g'), '') AS NUMERIC) * 3.30578 / 10000) BETWEEN 2 AND 400
        -- 2. 面積太詭異 (小於 3 坪的住宅/透天絕對是持分或畸零地)
        AND (CAST(NULLIF(REGEXP_REPLACE(CAST(building_area AS TEXT), '[^0-9.]', '', 'g'), '') AS NUMERIC) * 0.3025) >= 3
        
        LIMIT {current_limit};
        """

        try:
            with engine.begin() as conn:
                result = conn.execute(text(clean_sql))
                processed_count += result.rowcount
                
                # 計算進度與速度
                elapsed = time.time() - start_time
                speed = processed_count / elapsed if elapsed > 0 else 0
                percent = (processed_count / total_pending) * 100
                
                print(f"🚀 [Progress] {processed_count:,} / {total_pending:,} ({percent:.1f}%) | Speed: {speed:.0f} rows/s")
                
        except Exception as e:
            print(f"❌ [Error] 批次處理失敗，位置： {processed_count}: {e}")
            break

    print(f"🎉 [Finished] 清洗完成！共處理 {processed_count:,} 筆紀錄，耗時 {time.time()-start_time:.1f}s")

if __name__ == "__main__":
    # 強制清空舊資料重洗！
    run_incremental_clean(full_reclean=True, batch_size=10000, verification_limit=None)