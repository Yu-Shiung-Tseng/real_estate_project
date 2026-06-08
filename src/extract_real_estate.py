import os
import requests
import zipfile
import io
import datetime
import subprocess

# Set path configuration
EXTRACT_DIR = "data/extracted"
os.makedirs(EXTRACT_DIR, exist_ok=True)

def get_latest_two_seasons():
    """Calculates the latest two historical quarters based on the current time."""
    now = datetime.datetime.now()
    roc_year = now.year - 1911
    current_q = (now.month - 1) // 3 + 1
    
    seasons = []
    for i in range(1, 3): # Backtrack two quarters
        q = current_q - i
        y = roc_year
        if q <= 0:
            q += 4
            y -= 1
        seasons.append(f"{y}S{q}")
    return seasons

def download_and_extract(season):
    """Downloads and extracts the real estate registration ZIP for a specific quarter."""
    url = f"https://plvr.land.moi.gov.tw/DownloadSeason?season={season}&type=zip&fileName=lvr_landcsv.zip"
    print(f"📥 Downloading {season} data...")
    
    try:
        # Note: verify=False is used to skip SSL certificate verification for this specific government source
        response = requests.get(url, verify=False, timeout=30)
        if response.status_code == 200:
            # Create a dedicated directory for the quarter
            season_dir = os.path.join(EXTRACT_DIR, season)
            os.makedirs(season_dir, exist_ok=True)
            
            # Extract ZIP content
            with zipfile.ZipFile(io.BytesIO(response.content)) as zip_ref:
                zip_ref.extractall(season_dir)
            print(f"✅ {season} download and extraction completed!")
            return True
        else:
            print(f"⚠️ {season} download failed, HTTP status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {season} error occurred: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting real estate incremental crawler...")
    
    # 1. Get the target quarters
    target_seasons = get_latest_two_seasons()
    print(f"📅 Target capture quarters: {target_seasons}")
    
    # 2. Execute download and extraction
    success_seasons = []
    for season in target_seasons:
        if download_and_extract(season):
            success_seasons.append(season)

    # ==========================================
    # [Reserved Comment] Old version: Logic for capturing all historical data at once
    # ==========================================
    """
    for year in range(101, 114):
        for season in range(1, 5):
            season_str = f"{year}S{season}"
            download_and_extract(season_str)
    """
    # ==========================================

    # 3. Automatically call translator.py and pass the successful quarters
    if success_seasons:
        print(f"\n🔄 Preparing to call translator.py for data conversion...")
        seasons_arg = ",".join(success_seasons)
        
        # Execute another Python script via subprocess
        subprocess.run(["python", "src/translator.py", "--seasons", seasons_arg])
    else:
        print("\n❌ No data successfully downloaded, stopping further processing.")