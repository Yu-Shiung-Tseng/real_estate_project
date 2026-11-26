import React, { useState, useEffect } from "react";
import { Card, CardBody, Typography, Input, Button } from "@material-tailwind/react";
import {
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import ReactECharts from "echarts-for-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_BASE_URL });

const CITIES = [
  "all",
  "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "臺中市",
  "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣",
  "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣",
];

export function RiskWatchPage() {
  const [selectedCity, setSelectedCity] = useState("all");
  const [cancelData, setCancelData] = useState(null);
  const [pressureData, setPressureData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [projectSearch, setProjectSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg("");

    Promise.all([
      api.get("/api/risk/presale-cancellations", { params: { city: selectedCity } }),
      api.get("/api/risk/grace-period-pressure", { params: { city: selectedCity } }),
    ])
      .then(([cancelRes, pressureRes]) => {
        if (isCancelled) return;
        setCancelData(cancelRes.data);
        setPressureData(pressureRes.data);
        setCurrentPage(1);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("載入解約與賣壓觀察資料失敗:", err);
        setErrorMsg("目前無法載入解約與賣壓觀察資料，請稍後再試。");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  const cityLabel = selectedCity === "all" ? "全台總覽" : selectedCity;

  // ==========================================
  // 圖表 1：預售屋各季解約件數與總金額
  // ==========================================
  const getCancelTrendOption = () => {
    const rows = cancelData?.quarterly_trend || [];
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: { data: ["解約件數 (筆)", "累計解約金額 (億元)"], bottom: 0 },
      grid: { left: "3%", right: "4%", bottom: "14%", containLabel: true },
      xAxis: {
        type: "category",
        data: rows.map((r) => r.label),
      },
      yAxis: [
        {
          type: "value",
          name: "件數 (筆)",
          nameTextStyle: { color: "#64748b", fontSize: 11 },
          axisLabel: { color: "#64748b", fontSize: 11 },
          splitLine: { lineStyle: { color: "#f1f5f9" } },
        },
        {
          type: "value",
          name: "金額 (億)",
          splitNumber: 4,
          nameTextStyle: { color: "#94a3b8", fontSize: 11 },
          axisLabel: { color: "#94a3b8", fontSize: 11, formatter: "{value}億" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "解約件數 (筆)",
          type: "bar",
          yAxisIndex: 0,
          data: rows.map((r) => r.count),
          barMaxWidth: 32,
          itemStyle: { color: "#EF4444", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: "累計解約金額 (億元)",
          type: "line",
          yAxisIndex: 1,
          data: rows.map((r) => r.total_amount_yi),
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.5, color: "#F59E0B" },
          itemStyle: { color: "#F59E0B" },
        },
      ],
    };
  };

  // ==========================================
  // 圖表 2：縣市 / 行政區解約熱區排行
  // ==========================================
  const getAreaRankingOption = () => {
    const rows = [...(cancelData?.area_ranking || [])].reverse();
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const item = params[0];
          const raw = rows[item.dataIndex];
          return `<b>${raw.area_name}</b><br/>解約件數：<b>${raw.count} 筆</b><br/>涉及建案：${raw.projects} 個<br/>累計金額：${raw.total_amount_yi} 億元`;
        },
      },
      grid: { left: "3%", right: "8%", top: "4%", bottom: "4%", containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } } },
      yAxis: { type: "category", data: rows.map((r) => r.area_name) },
      series: [
        {
          type: "bar",
          data: rows.map((r) => r.count),
          barMaxWidth: 20,
          itemStyle: { color: "#FB7185", borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: "right", formatter: "{c} 筆", fontSize: 11 },
        },
      ],
    };
  };

  // ==========================================
  // 圖表 3：屋齡 3~5 年（寬限期滿窗口）轉手量與市佔趨勢
  // ==========================================
  const getPressureTrendOption = () => {
    const rows = pressureData?.quarterly_trend || [];
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      legend: { data: ["屋齡 3~5 年成交量 (筆)", "佔成屋市場比率 (%)"], bottom: 0 },
      grid: { left: "3%", right: "4%", bottom: "14%", containLabel: true },
      xAxis: { type: "category", data: rows.map((r) => r.label) },
      yAxis: [
        {
          type: "value",
          name: "成交量 (筆)",
          nameTextStyle: { color: "#64748b", fontSize: 11 },
          axisLabel: { color: "#64748b", fontSize: 11 },
          splitLine: { lineStyle: { color: "#f1f5f9" } },
        },
        {
          type: "value",
          name: "佔比 (%)",
          splitNumber: 4,
          nameTextStyle: { color: "#94a3b8", fontSize: 11 },
          axisLabel: { color: "#94a3b8", fontSize: 11, formatter: "{value}%" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "屋齡 3~5 年成交量 (筆)",
          type: "bar",
          yAxisIndex: 0,
          data: rows.map((r) => r.age3_5_count),
          barMaxWidth: 28,
          itemStyle: { color: "rgba(99, 102, 241, 0.55)", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: "佔成屋市場比率 (%)",
          type: "line",
          yAxisIndex: 1,
          data: rows.map((r) => r.share_pct),
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 3, color: "#EA580C" },
          itemStyle: { color: "#EA580C" },
        },
      ],
    };
  };

  // 最新解約明細搜尋與分頁
  const recentList = (cancelData?.recent_records || []).filter((item) => {
    if (!projectSearch.trim()) return true;
    const kw = projectSearch.trim().toLowerCase();
    return (
      (item.project_name || "").toLowerCase().includes(kw) ||
      (item.city || "").toLowerCase().includes(kw) ||
      (item.township || "").toLowerCase().includes(kw)
    );
  });
  const totalPages = Math.max(1, Math.ceil(recentList.length / itemsPerPage));
  const pagedRecent = recentList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="mt-6 flex flex-col gap-7 font-sans">
      {/* 頂部標題與縣市切換列 */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-slate-800">
            預售屋解約與交屋賣壓觀察
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            從內政部實價登錄公開「預售屋解約紀錄」與「屋齡 3～5 年成屋轉手讓利」，追蹤市場交屋與寬限期賣壓訊號
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="risk-city-select" className="text-xs font-bold text-slate-600 whitespace-nowrap">
            觀測範圍
          </label>
          <select
            id="risk-city-select"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="h-10 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-600 focus:outline-none cursor-pointer"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "全台總覽（22 縣市）" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 資料口徑與限制透明說明 */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 md:p-5 text-sm leading-7 text-slate-700 flex items-start gap-3">
        <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
        <div>
          <strong className="text-slate-900">資料口徑與指標說明：</strong>
          銀行個人房貸寬限期違約屬金融隱私資料，實價登錄並無直接揭露；本頁改以兩項官方公開訊號輔助觀測：
          <span className="font-semibold text-red-700">（1）預售屋公開解約紀錄</span>（民國 112 年 Q3 起揭露，反映限貸或交屋前斷鏈解約；註：官方會隨季檔回溯補登舊案解約，最新幾季數字會隨每季更新逐步補齊）與
          <span className="font-semibold text-orange-800">（2）屋齡 3～5 年成屋轉手與讓利比例</span>（寬限期常見屆滿窗口之急售與低於同區均價 85% 折價件數）。
        </div>
      </div>

      {errorMsg && (
        <Card className="border border-red-200 bg-red-50">
          <CardBody className="py-4 text-sm font-semibold text-red-700">{errorMsg}</CardBody>
        </Card>
      )}

      {/* ================================================= */}
      {/* 第一區塊：預售屋解約潮追蹤                          */}
      {/* ================================================= */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h2 className="text-lg font-bold text-slate-900">
            一、預售屋公開解約追蹤（{cityLabel}）
          </h2>
        </div>

        {/* 4 張 KPI 卡片 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-red-100 shadow-sm">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">累計公開解約件數</p>
                <p className="mt-1 text-2xl font-black text-red-600">
                  {isLoading ? "..." : `${(cancelData?.summary?.total_cancellations || 0).toLocaleString()} 筆`}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border border-slate-100 shadow-sm">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">涉及預售建案數</p>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {isLoading ? "..." : `${(cancelData?.summary?.affected_projects || 0).toLocaleString()} 個`}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BuildingOffice2Icon className="h-6 w-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border border-slate-100 shadow-sm">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">累計解約總金額</p>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {isLoading ? "..." : `${(cancelData?.summary?.total_amount_yi || 0).toLocaleString()} 億元`}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <BanknotesIcon className="h-6 w-6" />
              </div>
            </CardBody>
          </Card>

          <Card className="border border-slate-100 shadow-sm">
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">平均每戶解約總價</p>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {isLoading ? "..." : `${(cancelData?.summary?.avg_total_price_wan || 0).toLocaleString()} 萬`}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  最新解約日：{cancelData?.summary?.latest_cancel_date || "-"}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ChartBarSquareIcon className="h-6 w-6" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 雙圖表：季度解約走勢 + 地區排行 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 border border-slate-100 shadow-sm">
            <CardBody className="p-5">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                各季預售屋解約件數與金額走勢（依解約日期統計）
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                可觀察民國 113 年 Q3 信用管制上路前後之解約波峰變化
              </p>
              <div className="h-[340px]">
                {cancelData?.quarterly_trend?.length > 0 ? (
                  <ReactECharts option={getCancelTrendOption()} style={{ height: "100%", width: "100%" }} notMerge={true} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
                    {isLoading ? "資料載入中..." : "查無符合範圍之預售屋解約資料"}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-5 border border-slate-100 shadow-sm">
            <CardBody className="p-5">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {selectedCity === "all" ? "各縣市預售屋解約熱區 Top 12" : `${selectedCity} 各行政區解約排行 Top 12`}
              </h3>
              <p className="text-xs text-slate-400 mb-4">依實價登錄累計公開解約件數排序</p>
              <div className="h-[340px]">
                {cancelData?.area_ranking?.length > 0 ? (
                  <ReactECharts option={getAreaRankingOption()} style={{ height: "100%", width: "100%" }} notMerge={true} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
                    {isLoading ? "資料載入中..." : "暫無排行資料"}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 高解約建案 Top 15 + 最新解約明細 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5 border border-slate-100 shadow-sm overflow-hidden">
            <CardBody className="p-0">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                <h3 className="text-base font-bold text-slate-800">解約件數較多之預售建案（Top 15）</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  僅呈現件數排行（大型量體建案總戶數較多，解約件數亦可能較高，請搭配建案規模判讀）
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-xs text-slate-500">
                      <th className="py-3 px-4 font-bold">建案名稱</th>
                      <th className="py-3 px-3 font-bold">區域</th>
                      <th className="py-3 px-3 font-bold text-right">解約數</th>
                      <th className="py-3 px-4 font-bold text-right">均總價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cancelData?.top_projects || []).length > 0 ? (
                      cancelData.top_projects.map((p, idx) => (
                        <tr key={`${p.city}-${p.project_name}-${idx}`} className="border-b border-slate-50 hover:bg-red-50/30">
                          <td className="py-3 px-4 font-semibold text-slate-800">{p.project_name}</td>
                          <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                            {p.city}{p.township}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-red-600 whitespace-nowrap">
                            {p.cancel_count} 筆
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                            {p.avg_total_price_wan.toLocaleString()} 萬
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-10 text-center text-sm text-slate-400">
                          {isLoading ? "載入中..." : "查無解約建案紀錄"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-7 border border-slate-100 shadow-sm overflow-hidden">
            <CardBody className="p-0">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800">最新預售屋解約明細（近 100 筆）</h3>
                  <p className="text-xs text-slate-400 mt-0.5">可依建案名稱、縣市或行政區快速篩選</p>
                </div>
                <div className="w-full sm:w-60">
                  <Input
                    type="text"
                    placeholder="搜尋建案或行政區..."
                    containerProps={{ className: "!min-w-0" }}
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    icon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-xs text-slate-500">
                      <th className="py-3 px-4 font-bold">解約日期</th>
                      <th className="py-3 px-3 font-bold">原簽約日</th>
                      <th className="py-3 px-3 font-bold">區域</th>
                      <th className="py-3 px-3 font-bold">建案名稱</th>
                      <th className="py-3 px-3 font-bold">情形</th>
                      <th className="py-3 px-4 font-bold text-right">原總價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRecent.length > 0 ? (
                      pagedRecent.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-semibold text-red-700 whitespace-nowrap">{item.cancel_date}</td>
                          <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{item.contract_date}</td>
                          <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                            {item.city}{item.township}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">{item.project_name}</td>
                          <td className="py-3 px-3">
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                              {item.cancel_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                            {item.total_price_wan.toLocaleString()} 萬
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-sm text-slate-400">
                          {isLoading ? "載入中..." : "查無符合條件之解約明細"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-100">
                  <Typography variant="small" className="text-xs text-slate-500">
                    共 {recentList.length} 筆解約紀錄
                  </Typography>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 py-1.5 px-2.5 border-slate-200"
                    >
                      <ChevronLeftIcon className="h-3.5 w-3.5" /> 上一頁
                    </Button>
                    <span className="text-xs font-bold text-slate-700 px-1">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 py-1.5 px-2.5 border-slate-200"
                    >
                      下一頁 <ChevronRightIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ================================================= */}
      {/* 第二區塊：交屋後 3~5 年（寬限期滿窗口）賣壓與讓利觀察 */}
      {/* ================================================= */}
      <div className="flex flex-col gap-5 pt-2">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-6 w-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            二、交屋後 3～5 年（寬限期滿窗口）轉手賣壓與讓利觀察（{cityLabel}）
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-indigo-100 shadow-sm">
            <CardBody className="p-5">
              <p className="text-xs font-bold text-slate-500">近 4 季屋齡 3～5 年轉手量</p>
              <p className="mt-1 text-2xl font-black text-indigo-700">
                {isLoading ? "..." : `${(pressureData?.summary?.recent_4q_count || 0).toLocaleString()} 筆`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                截至 {pressureData?.summary?.latest_quarter || "-"}
              </p>
            </CardBody>
          </Card>

          <Card className="border border-slate-100 shadow-sm">
            <CardBody className="p-5">
              <p className="text-xs font-bold text-slate-500">佔整體成屋市場比率</p>
              <p className="mt-1 text-2xl font-black text-slate-800">
                {isLoading ? "..." : `${pressureData?.summary?.recent_4q_share_pct ?? 0}%`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">越高代表新成屋釋出比重越高</p>
            </CardBody>
          </Card>

          <Card className="border border-slate-100 shadow-sm">
            <CardBody className="p-5">
              <p className="text-xs font-bold text-slate-500">最新一季轉手量季變動</p>
              <p
                className={`mt-1 text-2xl font-black ${
                  (pressureData?.summary?.qoq_change_pct || 0) > 0 ? "text-orange-600" : "text-green-700"
                }`}
              >
                {isLoading
                  ? "..."
                  : `${(pressureData?.summary?.qoq_change_pct || 0) >= 0 ? "+" : ""}${
                      pressureData?.summary?.qoq_change_pct ?? 0
                    }%`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">與前一季 3～5 年成屋量比較</p>
            </CardBody>
          </Card>

          <Card className="border border-orange-100 shadow-sm">
            <CardBody className="p-5">
              <p className="text-xs font-bold text-slate-500">熱區低價讓利比率（&lt;均價 85%）</p>
              <p className="mt-1 text-2xl font-black text-orange-600">
                {isLoading ? "..." : `${pressureData?.summary?.avg_discount_ratio_pct ?? 0}%`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">折價幅度超過 15% 之交易佔比</p>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-6 border border-slate-100 shadow-sm">
            <CardBody className="p-5">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                屋齡 3～5 年新成屋季轉手量與市佔趨勢（民國 111 年迄今）
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                若比率明顯走升，常反映大量交屋區進入寬限期屆滿或獲利了結拋售期
              </p>
              <div className="h-[340px]">
                {pressureData?.quarterly_trend?.length > 0 ? (
                  <ReactECharts option={getPressureTrendOption()} style={{ height: "100%", width: "100%" }} notMerge={true} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
                    {isLoading ? "資料載入中..." : "暫無趨勢資料"}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-6 border border-slate-100 shadow-sm overflow-hidden">
            <CardBody className="p-0">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                <h3 className="text-base font-bold text-slate-800">
                  近 4 季 3～5 年新屋轉手與讓利熱區排行（Top 12 行政區）
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  同時觀察轉手量體與「低於同區同屋齡均價 85%」之折價件數比率
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-xs text-slate-500">
                      <th className="py-3 px-4 font-bold">行政區</th>
                      <th className="py-3 px-3 font-bold text-right">近 4 季轉手</th>
                      <th className="py-3 px-3 font-bold text-right">區均價</th>
                      <th className="py-3 px-3 font-bold text-right">折價件數</th>
                      <th className="py-3 px-4 font-bold text-right">讓利佔比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pressureData?.hotspot_districts || []).length > 0 ? (
                      pressureData.hotspot_districts.map((row, idx) => (
                        <tr key={`${row.city}-${row.township}-${idx}`} className="border-b border-slate-50 hover:bg-indigo-50/30">
                          <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            {row.city}{row.township}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-indigo-700">
                            {row.volume_4q.toLocaleString()} 筆
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                            {row.avg_price} 萬/坪
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">{row.discount_count} 筆</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                row.discount_ratio_pct >= 20
                                  ? "bg-red-100 text-red-700"
                                  : row.discount_ratio_pct >= 12
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {row.discount_ratio_pct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-10 text-center text-sm text-slate-400">
                          {isLoading ? "載入中..." : "查無符合門檻之行政區資料"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RiskWatchPage;
