# 🏠 Taiwan Real Estate Analytics Platform

以台灣內政部實價登錄資料為基礎建置的全端資料分析平台，提供房價趨勢查詢、區域分析與資料探索功能。

本專案展示了從資料蒐集、ETL、自動化資料更新、資料庫設計到前後端開發的完整流程。

---

## 📌 Project Overview

實價登錄資料量龐大且更新頻繁，因此建立了一套自動化流程，定期下載、整理並匯入 PostgreSQL，讓使用者能透過網頁介面快速查詢與分析不動產交易資料。

### 主要功能

- 自動下載最新實價登錄資料
- ETL 資料轉換與清洗流程
- PostgreSQL 資料儲存與查詢優化
- 房價趨勢分析
- 區域交易資料查詢
- RESTful API 服務
- 響應式前端介面

---

## 🛠 Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Axios

### Backend

- FastAPI
- Python
- SQLAlchemy
- Pandas

### Database

- PostgreSQL

### Deployment

- GitHub Pages
- Render

---

## 🏗 System Architecture

```text
User
 │
 ▼
React (GitHub Pages)
 │
 ▼
FastAPI
 │
 ▼
PostgreSQL
(Local Machine)
```

---

## 🔄 Data Pipeline

### 1. Extract

自動下載最新實價登錄資料檔案。

### 2. Transform

- 轉換縣市代碼
- 整理資料格式
- 合併不同交易類型資料

### 3. Load

- 增量匯入 PostgreSQL
- 避免重複資料寫入

### 4. Clean

- 排除異常交易資料
- 過濾不完整紀錄
- 提升分析資料品質

---

## ⚡ Database Optimization

為改善查詢效能，針對常用搜尋條件建立索引：

- City / Township 組合索引
- 條件索引（Partial Index）
- Materialized View 加速統計查詢

透過索引與預先計算統計資料，降低查詢時間並提升使用體驗。

---

## 🔐 Configuration & Security

- 使用 `.env` 管理環境變數
- 資料庫連線資訊不提交至版本控制
- 敏感資訊透過環境變數讀取

---

## 📂 Project Structure

```text
real_estate_ai/
│
├── src/
│   ├── api_main.py
│   ├── extract_real_estate.py
│   ├── translator.py
│   ├── loader.py
│   └── db_cleaner.py
│
├── frontend/
│   ├── src/
│   └── vite.config.js
│
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## 🚀 Getting Started

### Environment Variables

```env
DATABASE_URL=postgresql://username:password@host:5432/database
```

### Run with Docker

```bash
docker-compose up -d --build
```

### Update Data

```bash
python src/extract_real_estate.py
```

---

## 📈 Future Improvements

- 地圖視覺化分析
- 房價預測模型
- 使用者收藏與比較功能
- 更多統計分析指標

---

## 👨‍💻 Skills Demonstrated

- Full-Stack Development
- REST API Design
- Data Engineering (ETL)
- PostgreSQL Database Design
- Query Optimization
- Data Cleaning & Processing
- Docker Deployment
- Frontend / Backend Integration
