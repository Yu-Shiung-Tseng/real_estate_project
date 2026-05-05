# 🏠 Taiwan Real Estate Data Analysis Platform (real_estate_ai)

這是一個基於 Python 與 PostgreSQL 開發的台灣房價數據整理與分析平台。透過自動化 ETL 流程，追蹤各地區房價走勢。

## 🚀 快速啟動
1. **啟動資料庫**: `docker-compose up -d`
2. **安裝環境**: `pip install -r requirements.txt`
3. **建立資料表**: 在 DBeaver 執行 `database/schema.sql`
4. **執行管線**:
   - `python src/real_estate.py` (下載)
   - `python src/translator.py` (處理)
   - `python src/loader.py` (匯入)
5. **資料清洗**: 在 DBeaver 執行 `database/cleaning.sql`
