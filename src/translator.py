import os
import pandas as pd

# 1. 更改讀取的目標資料夾
BASE_DIR = "data/extracted"
# 更改輸出的目標路徑
OUTPUT_CSV = "data/real_estate_all.csv"

def load_data(dtype_label, target_files):
    all_data = []
    for season_folder in sorted(os.listdir(BASE_DIR)):
        folder_path = os.path.join(BASE_DIR, season_folder)
        if not os.path.isdir(folder_path):
            continue

        year_season = season_folder  
        year = int(year_season[:-2])
        season = int(year_season[-1])

        for file in os.listdir(folder_path):
            if file.lower() in target_files:
                csv_path = os.path.join(folder_path, file)
                try:
                    df = pd.read_csv(csv_path)
                    
                    # 2. 刪除英文表頭 (判斷第一列是否為英文)
                    if len(df) > 0 and 'The villages and towns urban district' in str(df.iloc[0].values):
                        df = df.drop(0)

                    # 加上標註欄位
                    df["year"] = year
                    df["season"] = season
                    df["case_type"] = dtype_label
                    all_data.append(df)

                    print(f"✅ 已讀取 {csv_path} ({len(df)} 筆)")
                except Exception as e:
                    print(f"⚠️ 讀取 {csv_path} 失敗: {e}")
                    
    # 如果 all_data 是空的，回傳空的 DataFrame
    if not all_data:
        return pd.DataFrame()
        
    return pd.concat(all_data, ignore_index=True)

# 合併 A (不動產買賣)
df_a = load_data("不動產買賣", ["a_lvr_land_a.csv"])

# 合併 B (預售屋買賣)
df_b = load_data("預售屋買賣", ["a_lvr_land_b.csv"])

# 合併成最終資料
df_all = pd.concat([df_a, df_b], ignore_index=True)

# 3. 將最終結果存入 data 資料夾
df_all.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
print(f"🎉 資料合併完成！已儲存至 {OUTPUT_CSV}")