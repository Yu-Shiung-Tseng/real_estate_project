# 🏠 Taiwan Real Estate Analytics Platform

以台灣內政部實價登錄資料為基礎建置的全端資料分析平台，提供房價趨勢查詢、區域分析與資料探索功能。

本專案展示了從資料蒐集 (ETL)、自動化管線、Docker 容器化微服務架構，到使用 Cloudflare Tunnel 實現零信任 (Zero Trust) 雲端部署的完整軟體工程實踐。

---

## 📌 Project Overview

實價登錄資料量龐大且更新頻繁，為此建立了一套自動化爬蟲與清洗流程，並將全端應用程式封裝為 Docker 容器，透過 Cloudflare 安全通道對外提供高可用性的 Web 服務。

### 🌟 核心亮點功能
- **自動化 ETL 管線**：一鍵爬取內政部最新季度資料，自動合併、去重並增量匯入 PostgreSQL。
- **資料防護與清洗**：透過 SQL 邏輯排除極端防呆數值（如純土地/車位、畸零面積、極端單價）。
- **容器化微服務架構**：使用 Docker-Compose 整合前端 (Nginx)、後端 (FastAPI) 與資料庫，實現地端/雲端環境一致性。
- **零信任安全部署 (Zero Trust)**：導入 Cloudflare Tunnel 進行內網穿透與反向代理，無須暴露公網 IP 或開放防火牆，即享有 SSL 加密與邊緣節點防護。
- **前後端分離與反向代理**：由 Nginx 統一收斂對外 Port 80 流量，並透過 `proxy_pass` 解決跨域 (CORS) 限制。

---

## 🛠 Tech Stack

- **Frontend**: React, Vite, Material Tailwind, ECharts (Axios)
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, Pandas
- **Database**: PostgreSQL 15
- **DevOps & Cloud**: Docker, Docker-Compose, Nginx, Cloudflare Tunnel (Zero Trust)

---

## 🏗 System Architecture

```text
User (Web Browser / Mobile)
 │ 🌐 [https://doban.uk](https://doban.uk) (Cloudflare Edge Network / SSL)
 ▼
Cloudflare Tunnel (Secure Zero Trust Connection)
 │ 🔒 Local Network (e.g., 192.168.x.x:80)
 ▼
[ Docker Compose Environment ]
┌────────────────────────────────────────────────────────┐
│  Nginx (Frontend & Reverse Proxy - Port 80)            │
│   ├─ React (Serve Static Files & Dashboard UI)         │
│   └─ /api/* ───► FastAPI (Backend Service - Port 8000) │
│                    │                                   │
│                    ▼                                   │
│                 PostgreSQL (Database - Port 5432)      │
└────────────────────────────────────────────────────────┘


## 💡 Acknowledgments
本專案的 UI 介面參考並使用了 [Material Tailwind Dashboard React](https://www.material-tailwind.com/)。
感謝其提供的專業 Dashboard 元件庫，大幅提升了開發效率與介面一致性。
