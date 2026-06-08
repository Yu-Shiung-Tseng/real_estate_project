import pandas as pd
from sqlalchemy import create_engine, text
import argparse
import subprocess
import os

# 資料庫連線配置
DB_URL = "postgresql://admin:admin123@db:5432/real_estate"
engine = create_engine(DB_URL)

def run_loader(file_path):
    """
    讀取轉換後的 CSV 檔案並增量匯入 PostgreSQL。
    特別處理「有/無」轉「1/0」，包含管理組織、電梯以及隔間欄位。
    """
    print(f"🚀 [Start] 正在讀取增量檔案: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ [Error] 找不到檔案: {file_path}")
        return

    try:
        # 讀取 CSV，所有欄位強制設為字串
        df = pd.read_csv(file_path, dtype=str, low_memory=False)
    except Exception as e:
        print(f"❌ [Error] 無法讀取 CSV 檔案: {e}")
        return

    print("🧹 [Clean] 正在正規化欄位名稱...")
    df.columns = df.columns.str.replace(r'[()（）/]', '', regex=True)

    # 處理重複欄位名稱
    if df.columns.has_duplicates:
        unique_cols = {}
        for col in df.columns.unique():
            col_data = df[col]
            unique_cols[col] = col_data.bfill(axis=1).iloc[:, 0] if isinstance(col_data, pd.DataFrame) else col_data
        df = pd.DataFrame(unique_cols)

    # 基於「編號」去重
    if '編號' in df.columns:
        df = df.drop_duplicates(subset=['編號'], keep='first')

    # 欄位映射表
    rename_mapping = {
        "鄉鎮市區": "township", "交易標的": "transaction_sign", "土地位置建物門牌": "address",
        "土地移轉總面積平方公尺": "land_area", "都市土地使用分區": "zoning", "交易年月日": "transaction_date",
        "交易筆棟數": "transaction_pen_number", "移轉層次": "shifting_level", "總樓層數": "total_floor_number",
        "建物型態": "building_state", "主要用途": "main_use", "主要建材": "main_building_materials",
        "建築完成年月": "construction_date", "建物移轉總面積平方公尺": "building_area", "建物現況格局-房": "room_count",
        "建物現況格局-廳": "hall_count", "建物現況格局-衛": "bath_count", "建物現況格局-隔間": "compartment_count",
        "有無管理組織": "has_management", "總價元": "total_price", "單價元平方公尺": "unit_price",
        "車位類別": "berth_category", "車位移轉總面積平方公尺": "berth_area", "車位總價元": "berth_price",
        "備註": "note", "編號": "serial_number", "主建物面積": "main_building_area",
        "附屬建物面積": "aux_building_area", "陽台面積": "balcony_area", "電梯": "has_elevator",
        "移轉編號": "transaction_id", "建案名稱": "project_name", "棟及號": "unit_number", "解約情形": "cancel_status"
    }
    
    df = df.rename(columns=rename_mapping)
    
    # 定義要寫入的欄位 (包含 city)
    db_cols = list(rename_mapping.values()) + ["city", "year", "season"]
    final_cols = [col for col in db_cols if col in df.columns]
    df = df[final_cols]

    print(f"⏳ [Load] 準備處理 {len(df)} 筆紀錄並執行型別轉換...")

    try:
        # A. 寫入暫存表
        df.to_sql('staging_raw_housing', engine, if_exists='replace', index=False)
        
        # B. 定義各欄位的資料型別轉換規則
        numeric_fields = {
            "land_area", "building_area", "total_price", "unit_price", 
            "berth_area", "berth_price", "main_building_area", 
            "aux_building_area", "balcony_area"
        }
        
        int_fields = {
            "year", "season", "room_count", "hall_count", "bath_count"
        }

        # ⚠️ 這裡加入了 compartment_count（隔間）
        bool_to_int_fields = {"has_management", "has_elevator", "compartment_count"}

        select_clause_parts = []
        for col in df.columns:
            if col in numeric_fields:
                select_clause_parts.append(f"CAST(NULLIF({col}, '') AS NUMERIC)")
            elif col in int_fields:
                select_clause_parts.append(f"CAST(NULLIF({col}, '') AS INTEGER)")
            elif col in bool_to_int_fields:
                # 💡 轉換邏輯：有 -> 1, 無 -> 0, 其他 -> NULL
                select_clause_parts.append(f"""
                    CAST(
                        CASE 
                            WHEN {col} = '有' THEN 1 
                            WHEN {col} = '無' THEN 0 
                            ELSE NULL 
                        END AS INTEGER
                    )
                """)
            else:
                select_clause_parts.append(col)

        columns_str = ", ".join(df.columns)
        select_str = ", ".join(select_clause_parts)

        # C. 執行增量寫入
        upsert_query = f"""
            INSERT INTO raw_housing_data ({columns_str})
            SELECT {select_str} FROM staging_raw_housing
            ON CONFLICT (serial_number) DO NOTHING;
        """
        
        with engine.begin() as conn:
            result = conn.execute(text(upsert_query))
            inserted_rows = result.rowcount
            # 刪除暫存表
            conn.execute(text("DROP TABLE staging_raw_housing;"))
            
        print(f"🎉 [Success] 匯入成功！共新增 {inserted_rows} 筆唯一紀錄。")

        # 自動觸發資料清洗
        print("\n🔄 正在呼叫 db_cleaner.py 執行資料清洗與格式化...")
        subprocess.run(["python", "src/db_cleaner.py"])

    except Exception as e:
        print(f"❌ [Error] 匯入失敗: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="將房地產 CSV 資料正確轉換型別後匯入 PostgreSQL。")
    parser.add_argument("--file", type=str, default="data/incremental_real_estate.csv", help="CSV 檔案路徑")
    args = parser.parse_args()
    
    run_loader(args.file)