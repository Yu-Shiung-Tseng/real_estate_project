import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  CardBody,
  Checkbox,
  Input,
  Button,
} from "@material-tailwind/react";
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  HomeModernIcon,
  BanknotesIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/solid";
import { StatisticsCard } from "@/widgets/cards";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 💡 建立一個客製化的 axios 實例
const api = axios.create({
  baseURL: API_BASE_URL,
});
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

export function Home() {
  // ==========================================
  // 1. 篩選器狀態管理 (移除 priceRange)
  // ==========================================
  const [cities] = useState([
    "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "臺中市",
    "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣",
    "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣",
  ]);
  const [selectedCity, setSelectedCity] = useState("臺中市");
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("all");

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [ageRange, setAgeRange] = useState({ min: "", max: "" });
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { min: "2025-01", max: currentYearMonth };
  });
  const [baseGeoJson, setBaseGeoJson] = useState(null);

  // ==========================================
  // 2. 數據狀態與進階列表狀態 (新增搜尋、排序、分頁)
  // ==========================================
  const [stats, setStats] = useState({
    total_count: 0,
    avg_price: 0,
    avg_pings: 0,
    total_amount_yi: 0,
    avg_age: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [detailList, setDetailList] = useState([]);

  // 新增：列表功能狀態
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [viewMode, setViewMode] = useState("chart"); // 'chart' | 'map'
  const [mapMode, setMapMode] = useState("price");   // 'price' | 'volume'
  const [mapData, setMapData] = useState([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentMapName, setCurrentMapName] = useState("");

  // ==========================================
  // 3. 房貸試算連動狀態 (保留您的完美邏輯)
  // ==========================================
  const [mortgageInput, setMortgageInput] = useState({
    unitPrice: 0,
    pings: 30,
    parkingPrice: 200,
    downPayment: 0,
  });

  const [loanConfig, setLoanConfig] = useState({
    years: 30,
    rate: 2.2,
  });

  const getFilterParams = () => {
    const params = new URLSearchParams();

    if (selectedCity) params.append("city", selectedCity);
    if (selectedDistrict && selectedDistrict !== "all") params.append("district", selectedDistrict);
    if (ageRange.min) params.append("min_age", ageRange.min);
    if (ageRange.max) params.append("max_age", ageRange.max);
    if (dateRange.min) params.append("min_date", dateRange.min);
    if (dateRange.max) params.append("max_date", dateRange.max);

    // 將陣列攤平，產生 building_types=大樓&building_types=透天 的格式
    if (selectedTypes.length > 0) {
      selectedTypes.forEach(type => params.append("building_types", type));
    }

    return params;
  };

  const estimatedTotalPriceWan = mortgageInput.unitPrice * mortgageInput.pings + mortgageInput.parkingPrice;
  const minDownPaymentWan = estimatedTotalPriceWan * 0.2;
  const effectiveDownPaymentWan = Math.max(mortgageInput.downPayment, minDownPaymentWan);
  const loanAmountWan = estimatedTotalPriceWan - effectiveDownPaymentWan;
  const loanPct = estimatedTotalPriceWan > 0 ? (loanAmountWan / estimatedTotalPriceWan) * 100 : 0;

  const monthlyPayment = (() => {
    const principal = loanAmountWan * 10000;
    const monthlyRate = loanConfig.rate / 100 / 12;
    const months = loanConfig.years * 12;

    if (principal <= 0) return 0;
    if (monthlyRate === 0) return Math.round(principal / months);

    const payment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment);
  })();

  // ==========================================
  // 4. 初始化與副作用 (Side Effects)
  // ==========================================
  useEffect(() => {
    fetch("/data/taiwan_townships.json")
      .then((res) => res.json())
      .then((geoJson) => {
        const processedFeatures = geoJson.features.map((feature) => {
          const countyRaw = feature.properties.county || "";
          const townRaw = feature.properties.town || "";
          const county = countyRaw.replace(/臺/g, "台").trim();
          const town = townRaw.replace(/臺/g, "台").trim();
          const fullIdentity = `${county}${town}`;
          return {
            ...feature,
            properties: {
              ...feature.properties,
              full_identity: fullIdentity,
              std_county: county,
              std_town: town,
            },
          };
        });
        setBaseGeoJson({ ...geoJson, features: processedFeatures });
      })
      .catch((err) => console.error("GeoJSON 載入失敗:", err));
  }, []);

  useEffect(() => {
    if (!baseGeoJson || !selectedCity) return;
    const stdCity = selectedCity.replace(/臺/g, "台");
    const cityFeatures = baseGeoJson.features.filter((f) => f.properties.std_county === stdCity);
    if (cityFeatures.length === 0) return;

    const mapName = `map_${stdCity}_${Date.now()}`;
    const cityGeoJson = { type: "FeatureCollection", features: cityFeatures };
    echarts.registerMap(mapName, cityGeoJson);
    setCurrentMapName(mapName);
    setIsMapLoaded(true);
  }, [baseGeoJson, selectedCity]);

  // ==========================================
  // A-3. 抓取熱力圖數據 (延遲載入拆分 - 3)
  // ==========================================

  useEffect(() => {
    if (viewMode !== "map" || !selectedCity) return;

    const params = getFilterParams();
    params.append("mode", mapMode); // 額外加入 map 專屬參數

    axios.get("/api/map-data", { params })
      .then((res) => {
        const normalizedData = res.data.map((item) => ({
          ...item,
          name: item.name.replace(/臺/g, "台"),
        }));
        setMapData(normalizedData);
      })
      .catch((err) => console.error("地圖 API 失敗:", err));

  }, [selectedCity, mapMode, selectedTypes, dateRange, ageRange, viewMode]);

  useEffect(() => {
    if (selectedCity) {
      axios.get(`/api/districts`, { params: { city: selectedCity } })
        .then((res) => {
          setDistricts(res.data);
          setSelectedDistrict("all");
        })
        .catch((err) => console.error("抓取行政區失敗", err));
    }
  }, [selectedCity]);

  // ==========================================
  // C. 核心數據抓取 (延遲載入拆分 - 1. 常駐查詢)
  // ==========================================
  useEffect(() => {
    const params = getFilterParams();

    axios.get("/api/stats", { params })
      .then((res) => setStats(res.data))
      .catch((err) => console.error("獲取統計資料失敗:", err));

    axios.get("/api/transactions", { params })
      .then((res) => {
        setDetailList(res.data);
        setCurrentPage(1);
      })
      .catch((err) => console.error("獲取交易明細失敗:", err));

  }, [selectedCity, selectedDistrict, selectedTypes, ageRange, dateRange]);

  // ==========================================
  // C-1. 獨立查詢：走勢圖 (延遲載入拆分 - 2)
  // ==========================================
  useEffect(() => {
    if (viewMode !== "chart") return;

    const params = getFilterParams();

    axios.get("/api/trends", { params })
      .then((res) => setTrendData(res.data))
      .catch((err) => console.error("獲取走勢資料失敗:", err));

  }, [selectedCity, selectedDistrict, selectedTypes, ageRange, dateRange, viewMode]);

  useEffect(() => {
    if (stats.avg_price > 0) {
      const newTotal = stats.avg_price * mortgageInput.pings + mortgageInput.parkingPrice;
      setMortgageInput((prev) => ({
        ...prev,
        unitPrice: stats.avg_price,
        downPayment: newTotal * 0.2,
      }));
    }
  }, [stats.avg_price]);

  useEffect(() => {
    if (mortgageInput.downPayment < minDownPaymentWan) {
      setMortgageInput((prev) => ({ ...prev, downPayment: minDownPaymentWan }));
    }
  }, [minDownPaymentWan]);

  const handleTypeChange = (type, checked) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type]);
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    }
  };

  // ==========================================
  // 💡 5. 進階列表處理邏輯 (搜尋 -> 排序 -> 分頁)
  // ==========================================
  const filteredData = detailList.filter((item) =>
    item.address ? item.address.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  const handleSort = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key] || 0;
    const bVal = b[sortConfig.key] || 0;
    return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

// ==========================================
  // 6. ECharts 配置 (已更新：雙 Y 軸與交易量柱狀圖)
  // ==========================================
  const getTrendOption = () => {
    const districtName = selectedDistrict === "all" ? "全區" : selectedDistrict;

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" }, // 滑鼠移上時顯示十字準星
        formatter: (params) => {
          let res = `<div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:4px;">${params[0].name}</div>`;
          params.forEach((p) => {
            // 根據 seriesType 動態決定單位是「萬/坪」還是「筆」
            const unit = p.seriesType === "bar" ? "筆" : "萬/坪";
            res += `${p.marker} ${p.seriesName}: <span style="font-weight:bold;">${p.value} ${unit}</span><br/>`;
          });
          return res;
        },
      },
      legend: {
        data: [`${districtName}交易量`, `${districtName}單價`, `${selectedCity}單價`],
        bottom: 0,
      },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: trendData.map((d) => `${d.year}-Q${d.season}`),
        axisPointer: { type: "shadow" },
      },
      yAxis: [
        {
          type: "value",
          name: "單價 (萬/坪)",
          position: "left",
          splitLine: { lineStyle: { color: "#f1f5f9" } }, 
        },
        {
          type: "value",
          name: "交易量 (筆)",
          position: "right",
          splitLine: { show: false }, 
          max: (value) => Math.ceil(value.max * 4), 
        },
      ],
      series: [
        {
          name: `${districtName}交易量`,
          type: "bar",
          yAxisIndex: 1, 
          data: trendData.map((d) => d.district_volume), 
          barMaxWidth: 35, 
          itemStyle: { 
            
            color: "rgba(147, 197, 253, 0.4)", 
            borderRadius: [4, 4, 0, 0] 
          },
        },
        {
          name: `${selectedCity}單價`,
          type: "line",
          yAxisIndex: 0,
          data: trendData.map((d) => d.city_avg),
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2, type: "dashed", color: "#F44336" },
          itemStyle: { color: "#F44336" },
        },
        {
          name: `${selectedCity}單價`,
          type: "line",
          yAxisIndex: 0,
          data: trendData.map((d) => d.city_avg),
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2, type: "dashed", color: "#F44336" },
          itemStyle: { color: "#F44336" },
        },
      ],
    };
  };

  const getMapOption = () => {
    const isPriceMode = mapMode === "price";
    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          if (!params.data) return `<div><b>${params.name}</b><br/>無成交資料</div>`;
          return `
          <div>
            <div style="font-weight:bold;font-size:14px;">${params.name}</div>
            <div style="margin-top:6px;">${isPriceMode ? "價格強度" : "成交熱度"}：<b>${params.value}%</b></div>
            <div style="margin-top:4px;">成交筆數：<b>${params.data.actual_count}</b></div>
          </div>`;
        },
      },
      visualMap: {
        min: mapMode === "price" ? 70 : 50,
        max: mapMode === "price" ? 130 : 200,
        left: "left",
        bottom: 20,
        calculable: true,
        text: ["熱", "冷"],
        inRange: { color: ["#3b82f6", "#93c5fd", "#dbeafe", "#f8fafc", "#fee2e2", "#fca5a5", "#ef4444"] },
      },
      series: [
        {
          type: "map",
          map: currentMapName,
          roam: true,
          zoom: 1.1,
          nameProperty: "full_identity",
          label: { show: true, fontSize: 10, color: "#222" },
          emphasis: { label: { color: "#111", fontWeight: "bold" }, itemStyle: { borderColor: "#222", borderWidth: 2 } },
          data: mapData,
        },
      ],
    };
  };

  return (
    <div className="mt-12 flex flex-col gap-8">
      {/* 頂部三欄位佈局 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* === 左欄：進階篩選與房貸 === */}
        <div className="md:col-span-3">
          <Card className="h-full">
            <CardBody className="flex flex-col gap-6">
              <div>
                <Typography variant="h6" color="blue-gray" className="mb-4">區域搜尋</Typography>
                <div className="flex flex-col gap-4">
                  <div className="w-full">
                    <label className="block text-xs font-bold text-blue-gray-500 mb-1 uppercase">選擇縣市</label>
                    <select
                      className="w-full h-11 px-3 border border-blue-gray-200 rounded-lg text-sm text-blue-gray-700 bg-white focus:border-gray-900 focus:outline-none transition-all cursor-pointer"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                    >
                      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-bold text-blue-gray-500 mb-1 uppercase">選擇行政區</label>
                    <select
                      className="w-full h-11 px-3 border border-blue-gray-200 rounded-lg text-sm text-blue-gray-700 bg-white focus:border-gray-900 focus:outline-none transition-all cursor-pointer"
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                    >
                      <option value="all">全部行政區</option>
                      {districts.map((d) => <option key={d.trim()} value={d.trim()}>{d.trim()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 交易條件篩選 (移除了價格區間，變更排版) */}
              <div>
                <Typography variant="small" className="font-bold text-blue-gray-500 mb-3 uppercase">
                  交易條件篩選
                </Typography>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Input label="最短屋齡" type="number" value={ageRange.min} onChange={(e) => setAgeRange({ ...ageRange, min: e.target.value })} />
                  <Input label="最長屋齡" type="number" value={ageRange.max} onChange={(e) => setAgeRange({ ...ageRange, max: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="起始月份" type="month" value={dateRange.min} onChange={(e) => setDateRange({ ...dateRange, min: e.target.value })} />
                  <Input label="結束月份" type="month" value={dateRange.max} onChange={(e) => setDateRange({ ...dateRange, max: e.target.value })} />
                </div>
              </div>

              {/* 建物型態 */}
              <div>
                <Typography variant="small" className="font-bold text-blue-gray-500 mb-2 uppercase">建物型態</Typography>
                <div className="grid grid-cols-2 gap-1">
                  {["住宅大樓", "華廈", "公寓", "透天厝"].map((type) => (
                    <Checkbox
                      key={type}
                      label={type}
                      checked={selectedTypes.includes(type)}
                      ripple={false}
                      containerProps={{ className: "p-0" }}
                      labelProps={{ className: "text-sm font-medium text-blue-gray-700" }}
                      onChange={(e) => handleTypeChange(type, e.target.checked)}
                    />
                  ))}
                </div>
              </div>

              <hr className="my-2 border-blue-gray-50" />

              {/* 房貸試算模組 */}
              <div className="flex flex-col gap-4">
                <Typography variant="h6" color="blue-gray">房貸試算設定</Typography>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="單價 (萬/坪)" type="number" step="0.1" value={mortgageInput.unitPrice} onChange={(e) => setMortgageInput({ ...mortgageInput, unitPrice: parseFloat(e.target.value) || 0 })} />
                    <Input label="預計坪數" type="number" value={mortgageInput.pings} onChange={(e) => setMortgageInput({ ...mortgageInput, pings: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <Input label="車位總價 (萬)" type="number" value={mortgageInput.parkingPrice} onChange={(e) => setMortgageInput({ ...mortgageInput, parkingPrice: parseFloat(e.target.value) || 0 })} />
                  <div className="relative">
                    <Input label="自備款 (萬)" type="number" value={mortgageInput.downPayment} onChange={(e) => setMortgageInput({ ...mortgageInput, downPayment: parseFloat(e.target.value) || 0 })} />
                    {mortgageInput.downPayment <= minDownPaymentWan && (
                      <Typography variant="small" color="red" className="absolute -bottom-5 right-0 text-[10px] font-bold">
                        *最低自備款: {Math.round(minDownPaymentWan)} 萬
                      </Typography>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="貸款成數 (%)" type="number" disabled value={loanPct.toFixed(1)} className="bg-gray-50" />
                    <Input label="年利率 (%)" type="number" step="0.1" value={loanConfig.rate} onChange={(e) => setLoanConfig({ ...loanConfig, rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="mt-4 p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                    <Typography variant="small" className="font-bold text-blue-800">預估房屋總價</Typography>
                    <Typography variant="h6" color="blue">{Math.round(estimatedTotalPriceWan).toLocaleString()} 萬</Typography>
                  </div>
                  <div>
                    <Typography variant="small" className="font-bold text-blue-800 mb-1">預估每月還款</Typography>
                    <div className="flex items-baseline gap-1">
                      <Typography variant="h3" color="blue">${monthlyPayment.toLocaleString()}</Typography>
                      <Typography variant="small" className="text-blue-gray-500 font-bold">元</Typography>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* === 中欄：核心視覺化 === */}
        <div className="md:col-span-6">
          <Card className="h-[920px]">
            <CardBody className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <Typography variant="h5" color="blue-gray">
                    {viewMode === "chart" ? `${selectedCity}${selectedDistrict === "all" ? "" : selectedDistrict} 房價強弱走勢` : "全台行政區房價熱力分佈"}
                  </Typography>
                  <Typography variant="small" className="text-blue-gray-400 font-normal mt-1">
                    {viewMode === "chart" ? "對照縣市大盤之相對趨勢分析" : "基於最新實價登錄之區域分佈"}
                  </Typography>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex bg-blue-gray-100 p-1.5 rounded-xl">
                    <button onClick={() => setViewMode("chart")} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === "chart" ? "bg-white shadow-md text-blue-500" : "text-gray-600 hover:text-gray-900"}`}>
                      走勢圖
                    </button>
                    <button onClick={() => setViewMode("map")} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === "map" ? "bg-white shadow-md text-blue-500" : "text-gray-600 hover:text-gray-900"}`}>
                      熱力圖
                    </button>
                  </div>
                  {viewMode === "map" && (
                    <div className="flex bg-orange-50 p-1 rounded-lg border border-orange-100">
                      <button onClick={() => setMapMode("price")} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${mapMode === "price" ? "bg-orange-500 text-white shadow-sm" : "text-orange-800 hover:bg-orange-100"}`}>
                        價格強度 %
                      </button>
                      <button onClick={() => setMapMode("volume")} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${mapMode === "volume" ? "bg-orange-500 text-white shadow-sm" : "text-orange-800 hover:bg-orange-100"}`}>
                        成交熱度 %
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-grow">
                {viewMode === "chart" ? (
                  trendData.length > 0 ? (
                    <ReactECharts key="trend-chart" option={getTrendOption()} style={{ height: "100%", width: "100%" }} notMerge={true} />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                      <Typography color="blue-gray" className="opacity-40 font-bold">暫無篩選範圍內之走勢數據</Typography>
                    </div>
                  )
                ) : isMapLoaded ? (
                  <ReactECharts key={currentMapName} option={getMapOption()} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={false} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-blue-gray-50 rounded-3xl border-2 border-dashed border-blue-gray-100">
                    <Typography color="blue-gray" className="font-bold text-lg mb-2">地圖圖資載入中...</Typography>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* === 右欄：統計卡片 === */}
        <div className="md:col-span-3 flex flex-col gap-6">
          <StatisticsCard title="平均成交單價" value={`${stats.avg_price?.toLocaleString() || 0} 萬/坪`} color="blue" icon={<CurrencyDollarIcon className="h-7 w-7 text-white" />} />
          <StatisticsCard title="總成交件數" value={`${stats.total_count?.toLocaleString() || 0} 筆`} color="green" icon={<ChartBarIcon className="h-7 w-7 text-white" />} />
          <StatisticsCard title="累積成交總額" value={`${stats.total_amount_yi || 0} 億元`} color="red" icon={<BanknotesIcon className="h-7 w-7 text-white" />} />
          <StatisticsCard title="平均移轉面積" value={`${stats.avg_pings || 0} 坪`} color="orange" icon={<HomeModernIcon className="h-7 w-7 text-white" />} />
          <StatisticsCard title="平均成交屋齡" value={stats.avg_age ? `${Number(stats.avg_age).toFixed(1)} 年` : "無資料"} color="indigo" icon={<ClockIcon className="h-7 w-7 text-white" />} />
        </div>
      </div>

      {/* --- 下半部：成交清單 (加入搜尋、排序、分頁) --- */}
      <Card className="overflow-hidden shadow-lg border border-blue-gray-100">
        <CardBody className="p-0">
          <div className="bg-gray-50 p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <Typography variant="h6" color="blue-gray">最新成交紀錄明細</Typography>
              <Typography variant="small" className="text-blue-gray-400 font-medium italic">
                顯示符合條件之所有紀錄
              </Typography>
            </div>
            {/* 💡 搜尋輸入框 */}
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="搜尋路名或地址..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                className="bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-auto text-left">
              <thead>
                <tr className="bg-blue-gray-50/20">
                  {["交易日期", "地址", "建物型態", "成交屋齡"].map((h) => (
                    <th key={h} className="p-5 border-b border-blue-gray-100 opacity-80 text-xs font-bold text-blue-gray-600 uppercase">
                      {h}
                    </th>
                  ))}
                  {/* 💡 加入可排序表頭 */}
                  <th
                    className="p-5 border-b border-blue-gray-100 opacity-80 text-xs font-bold text-blue-gray-600 uppercase cursor-pointer hover:bg-gray-100/50"
                    onClick={() => handleSort("total_price")}
                  >
                    <div className="flex items-center gap-1">
                      總價 (元)
                      <ArrowsUpDownIcon className={`h-3 w-3 ${sortConfig.key === "total_price" ? "text-blue-500" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th
                    className="p-5 border-b border-blue-gray-100 opacity-80 text-xs font-bold text-blue-gray-600 uppercase cursor-pointer hover:bg-gray-100/50"
                    onClick={() => handleSort("unit_price_per_ping")}
                  >
                    <div className="flex items-center gap-1">
                      單價 (萬/坪)
                      <ArrowsUpDownIcon className={`h-3 w-3 ${sortConfig.key === "unit_price_per_ping" ? "text-blue-500" : "text-gray-300"}`} />
                    </div>
                  </th>
                  <th className="p-5 border-b border-blue-gray-100 opacity-80 text-xs font-bold text-blue-gray-600 uppercase">
                    坪數
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => {
                    const isBargain = item.unit_price_per_ping && stats.avg_price && item.unit_price_per_ping < stats.avg_price * 0.7;
                    return (
                      <tr key={index} className={`transition-all ${isBargain ? "bg-yellow-50" : "hover:bg-blue-50/50"}`}>
                        <td className="p-5 border-b border-blue-gray-50 text-sm font-medium">{item.transaction_western_date}</td>
                        <td className="p-5 border-b border-blue-gray-50 text-sm font-bold flex items-center">
                          {isBargain && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-2 shadow-sm">
                              低價
                            </span>
                          )}
                          {item.address}
                        </td>
                        <td className="p-5 border-b border-blue-gray-50 text-sm text-gray-600">{item.building_state}</td>
                        {/* 💡 屋齡防呆處理 */}
                        <td className="p-5 border-b border-blue-gray-50 text-sm text-gray-600">
                          {item.building_age_at_transaction != null ? `${item.building_age_at_transaction} 年` : "-"}
                        </td>
                        <td className="p-5 border-b border-blue-gray-50 text-sm font-black text-red-600">{item.total_price?.toLocaleString()}</td>
                        <td className="p-5 border-b border-blue-gray-50 text-sm font-black text-blue-gray-900">{item.unit_price_per_ping?.toLocaleString()}</td>
                        <td className="p-5 border-b border-blue-gray-50 text-sm text-blue-gray-700">{item.building_pings} 坪</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-16 text-center">
                      <Typography color="blue-gray" className="opacity-30 font-bold italic">
                        目前查無相關交易明細，請試著調整篩選條件或搜尋字詞。
                      </Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 💡 分頁控制列 */}
          {totalPages > 1 && (
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
              <Typography variant="small" color="blue-gray" className="font-normal">
                顯示第 {indexOfFirstItem + 1} 至 {Math.min(indexOfLastItem, sortedData.length)} 筆，共 {sortedData.length} 筆
              </Typography>
              <div className="flex items-center gap-2">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 border-gray-300"
                >
                  <ChevronLeftIcon strokeWidth={2} className="h-4 w-4" /> 上一頁
                </Button>
                <Typography variant="small" color="blue-gray" className="font-bold px-2">
                  {currentPage} / {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 border-gray-300"
                >
                  下一頁 <ChevronRightIcon strokeWidth={2} className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default Home;