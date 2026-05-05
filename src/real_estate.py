import os
import requests
import zipfile
import time
from datetime import datetime


# === 指定資料夾結構 ===
BASE_DIR = "data"  # 更改為 data
ZIP_DIR = os.path.join(BASE_DIR, "zip")
EXTRACT_DIR = os.path.join(BASE_DIR, "extracted")

os.makedirs(ZIP_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)


def real_estate_season(year, season):
    """下載單季的實價登錄資料並解壓縮"""
    if year > 1000:  # 如果輸入西元年，轉民國
        year -= 1911

    url = f"https://plvr.land.moi.gov.tw/DownloadSeason?season={year}S{season}&type=zip&fileName=lvr_landcsv.zip"
    print("下載:", url)

    # zip 存檔路徑
    zip_path = os.path.join(ZIP_DIR, f"{year}S{season}.zip")

    try:
        res = requests.get(url, proxies={"http": None, "https": None}, timeout=60, verify=False)
        if res.status_code != 200:
            print(f"❌ 下載失敗 {year}S{season}: {res.status_code}")
            return

        # 儲存 zip
        with open(zip_path, "wb") as f:
            f.write(res.content)

        # 解壓縮
        extract_folder = os.path.join(EXTRACT_DIR, f"{year}S{season}")
        os.makedirs(extract_folder, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_folder)

        print(f"✅ {zip_path} 已解壓縮到 {extract_folder}")

    except Exception as e:
        print(f"⚠️ {year}S{season} 錯誤: {e}")

    time.sleep(3)  # 避免過快被擋



# === 自動抓最近五年 ===
today = datetime.today()
current_year = today.year
current_season = (today.month - 1) // 3 + 1
start_year = current_year - 2

for year in range(start_year, current_year + 1):
    for season in range(1, 5):
        if year == current_year and season > current_season:
            break
        real_estate_season(year, season)





