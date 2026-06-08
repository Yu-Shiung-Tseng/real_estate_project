import os
import pandas as pd
import argparse
import subprocess

# 路徑配置
BASE_DIR = "data/extracted"
# 增量模式的輸出檔名
OUTPUT_CSV = "data/incremental_real_estate.csv"

# 內政部縣市代碼映射表
CITY_MAP = {
    'a': '臺北市', 'b': '臺中市', 'c': '基隆市', 'd': '臺南市',
    'e': '高雄市', 'f': '新北市', 'g': '宜蘭縣', 'h': '桃園市',
    'i': '嘉義市', 'j': '新竹縣', 'k': '苗栗縣', 'm': '南投縣',
    'n': '彰化縣', 'p': '雲林縣', 'q': '嘉義縣', 't': '屏東縣',
    'u': '花蓮縣', 'v': '臺東縣', 'w': '金門縣', 'x': '澎湖縣',
    'z': '連江縣', 'o': '新竹市'
}

def load_data(dtype_label, target_suffix, target_seasons):
    """
    掃描指定的季度資料夾，合併特定後綴的 CSV 檔案，並注入縣市資訊。
    """
    all_data = []
    if not os.path.exists(BASE_DIR):
        print(f"❌ 錯誤: 找不到目錄 '{BASE_DIR}'")
        return pd.DataFrame()

    print(f"--- 正在處理類別: {dtype_label} ---")
    for season_folder in target_seasons:
        folder_path = os.path.join(BASE_DIR, season_folder)
        if not os.path.isdir(folder_path):
            print(f"  ⚠️ 警告: 找不到季度資料夾 {season_folder}，跳過。")
            continue

        # 遍歷資料夾內的所有 CSV
        for file in os.listdir(folder_path):
            if file.lower().endswith(target_suffix):
                # 關鍵邏輯：從檔名首字母取得縣市代碼 (例如 'a_lvr_land_a.csv' -> 'a')
                city_code = file[0].lower()
                city_name = CITY_MAP.get(city_code, "未知")
                
                csv_path = os.path.join(folder_path, file)
                try:
                    # 使用 dtype=str 避免自動轉型錯誤，on_bad_lines 跳過毀損行
                    df = pd.read_csv(csv_path, dtype=str, on_bad_lines='skip', low_memory=False)
                    
                    if len(df) > 0:
                        # ⚠️ 注入絕對正確的縣市資料
                        df['city'] = city_name
                        
                        # 處理季度資訊 (選填，可供後續分析使用)
                        df['year'] = season_folder[:-2]
                        df['season'] = season_folder[-1]

                        # 移除內政部資料常見的英文標頭行 (通常在第一行)
                        if 'The villages' in str(df.iloc[0, 0]):
                            df = df.drop(df.index[0])
                        
                        all_data.append(df)
                        print(f"  ✅ 已載入: {file} ({city_name})")
                except Exception as e:
                    print(f"  ❌ 讀取檔案 {file} 時發生錯誤: {e}")

    return pd.concat(all_data, ignore_index=True) if all_data else pd.DataFrame()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real estate data incremental transformation tool")
    parser.add_argument("--seasons", type=str, help="指定要處理的季度，例如: 113S2,113S1 或 all")
    args = parser.parse_args()

    if not args.seasons:
        print("❌ 請提供目標季度，例如: python src/translator.py --seasons 113S2 (或使用 --seasons all 處理全部)")
        exit(1)

    # 🌟 判斷邏輯：如果輸入 'all'，就自動抓取 data/extracted 下所有的資料夾
    if args.seasons.lower() == 'all':
        target_seasons = [d for d in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, d))]
        print(f"📂 [Mode] 偵測到 'all' 參數，將合併所有已下載的季度資料，共計 {len(target_seasons)} 季...")
    else:
        target_seasons = args.seasons.split(",")

    # (已經將導致覆蓋的 target_seasons = args.seasons.split(",") 刪除)
    print(f"🚀 開始執行增量轉換，目標季度: {target_seasons}")

    # 分別處理「買賣」(_a.csv) 與「預售屋」(_b.csv) 資料
    df_sales = load_data("不動產買賣", "_lvr_land_a.csv", target_seasons)
    df_pre = load_data("預售屋買賣", "_lvr_land_b.csv", target_seasons)

    # 合併兩者
    if not df_sales.empty or not df_pre.empty:
        df_all = pd.concat([df_sales, df_pre], ignore_index=True)
        
        # 確保輸出目錄存在
        os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
        
        # 儲存為 CSV (使用 utf-8-sig 以利 Excel 讀取繁體中文)
        df_all.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
        
        print(f"\n✨ 轉換完成！增量紀錄總數: {len(df_all)}")
        print(f"📦 檔案已儲存至: {OUTPUT_CSV}")
        
        # ==========================================
        # 🚨 自動觸發下一步：呼叫 loader.py 匯入資料庫
        # ==========================================
        print("\n🔄 正在呼叫 loader.py 將資料匯入 PostgreSQL...")
        subprocess.run(["python", "src/loader.py", "--file", OUTPUT_CSV])

    else:
        print("\n❌ 錯誤: 在指定季度中找不到任何資料。")