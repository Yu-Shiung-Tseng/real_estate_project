import pandas as pd
from sqlalchemy import create_engine
import os

# 資料路徑
CSV_PATH = "data/real_estate_all.csv"

# 資料庫連線資訊 (對應 docker-compose.yml)
DB_USER = "admin"
DB_PASS = "admin123"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "real_estate"

# 建立資料庫引擎
engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

def load_csv_to_postgres():
    if not os.path.exists(CSV_PATH):
        print(f"❌ 找不到資料檔: {CSV_PATH}")
        return

    print("🚀 開始讀取資料並準備匯入...")
    
    # 加入 low_memory=False 解決 DtypeWarning，並強制指定某些欄位為字串
    df = pd.read_csv(CSV_PATH, low_memory=False, dtype=str) 

    # 欄位映射對照表 (保持不變)
    column_mapping = {
        '鄉鎮市區': 'township', '交易標的': 'transaction_sign', '土地位置建物門牌': 'address',
        '土地移轉總面積平方公尺': 'land_area', '都市土地使用分區': 'zoning',
        '非都市土地使用分區': 'non_metropolis_zoning', '非都市土地使用編定': 'non_metropolis_usage',
        '交易年月日': 'transaction_date', '交易筆棟數': 'transaction_pen_number',
        '移轉層次': 'shifting_level', '總樓層數': 'total_floor_number',
        '建物型態': 'building_state', '主要用途': 'main_use', '主要建材': 'main_building_materials',
        '建築完成年月': 'construction_date', '建物移轉總面積平方公尺': 'building_area',
        '建物現況格局-房': 'room_count', '建物現況格局-廳': 'hall_count',
        '建物現況格局-衛': 'bath_count', '建物現況格局-隔間': 'compartment_count',
        '有無管理組織': 'has_management', '總價元': 'total_price',
        '單價元平方公尺': 'unit_price', '車位類別': 'berth_category',
        '車位移轉總面積平方公尺': 'berth_area', '車位總價元': 'berth_price',
        '備註': 'note', '編號': 'serial_number', '主建物面積': 'main_building_area',
        '附屬建物面積': 'aux_building_area', '陽台面積': 'balcony_area',
        '電梯': 'has_elevator', '移轉編號': 'transaction_id',
        'year': 'year', 'season': 'season', 'case_type': 'case_type',
        '建案名稱': 'project_name', '棟及號': 'unit_number', '解約情形': 'cancel_status'
    }

    df = df.rename(columns=column_mapping)

    # 修正數值欄位：確保轉回數字型態
    numeric_cols = ['land_area', 'building_area', 'total_price', 'unit_price', 'berth_area', 'berth_price', 'main_building_area', 'aux_building_area', 'balcony_area', 'year', 'season', 'room_count', 'hall_count', 'bath_count']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # 寫入資料庫
    try:
        # 使用 method='multi' 或 chunksize 加速
        df.to_sql('raw_housing_data', engine, if_exists='append', index=False, chunksize=1000)
        print(f"🎉 匯入成功！共匯入 {len(df)} 筆資料。")
    except Exception as e:
        print(f"⚠️ 匯入失敗: {e}")

if __name__ == "__main__":
    load_csv_to_postgres()