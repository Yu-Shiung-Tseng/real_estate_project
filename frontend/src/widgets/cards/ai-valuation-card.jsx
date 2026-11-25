import React, { useState, useEffect } from "react";
import { Card, CardBody, Typography, Input, Button } from "@material-tailwind/react";
import { SparklesIcon, CalculatorIcon } from "@heroicons/react/24/solid";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_BASE_URL });

const BUILDING_TYPES = ["住宅大樓", "華廈", "公寓", "透天厝", "套房", "其他"];

export function AiValuationCard({
  cities,
  activeCity,
  activeDistrict,
  onApplyToMortgage,
}) {
  const [city, setCity] = useState(activeCity || "臺中市");
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState(activeDistrict || "all");
  const [buildingType, setBuildingType] = useState("住宅大樓");
  const [pings, setPings] = useState("35");
  const [age, setAge] = useState("10");
  const [parkingPrice, setParkingPrice] = useState("200");

  const [modelInfo, setModelInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);

  // 讀取線上模型訓練資訊與驗證指標
  useEffect(() => {
    let isCancelled = false;
    api
      .get("/api/ml/model-info")
      .then((res) => {
        if (!isCancelled) setModelInfo(res.data);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  // 當上方主查詢的縣市/行政區更新時，同步預填到估價器
  useEffect(() => {
    if (activeCity) {
      setCity(activeCity);
      setDistrict(activeDistrict || "all");
    }
  }, [activeCity, activeDistrict]);

  // 估價器縣市變更時即時載入行政區清單
  useEffect(() => {
    let isCancelled = false;
    if (city) {
      api
        .get("/api/districts", { params: { city } })
        .then((res) => {
          if (!isCancelled) setDistricts(res.data);
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [city]);

  const handleCityChange = (newCity) => {
    setCity(newCity);
    setDistrict("all");
    setDistricts([]);
  };

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const parsedPings = parseFloat(pings);
    if (!parsedPings || parsedPings <= 0 || parsedPings > 500) {
      setErrorMsg("請輸入有效建物坪數（1 ~ 500 坪）");
      return;
    }

    const parsedAge = age === "" ? null : parseFloat(age);
    if (parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 100)) {
      setErrorMsg("屋齡請輸入 0 ~ 100 年（或留空）");
      return;
    }

    const parsedParking = parkingPrice === "" ? 0 : parseFloat(parkingPrice) || 0;

    setIsPredicting(true);
    try {
      const res = await api.post("/api/ml/predict-price", {
        city,
        district,
        building_type: buildingType,
        building_pings: parsedPings,
        building_age: parsedAge,
        parking_price: Math.max(0, parsedParking),
      });
      setResult(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(detail || "AI 估價服務暫時無法使用，請稍後再試。");
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <Card className="border border-indigo-100 shadow-lg overflow-hidden">
      <CardBody className="p-5 md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-2 border-b border-blue-gray-50 pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-md">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <Typography variant="h6" color="blue-gray" className="font-bold">
                AI 單戶智慧行情估價
              </Typography>
              <Typography variant="small" className="text-xs text-blue-gray-400">
                基於 HistGradientBoosting 梯度提升樹模型，依實價登錄大數據推估合理單價與總價區間
              </Typography>
            </div>
          </div>

          {modelInfo?.loaded && modelInfo.metrics && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700 border border-indigo-100">
                R² {modelInfo.metrics.r2}
              </span>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 font-bold text-purple-700 border border-purple-100">
                驗證誤差 MAPE {modelInfo.metrics.mape_pct}%
              </span>
              <span className="rounded-full bg-blue-gray-50 px-2.5 py-1 font-medium text-blue-gray-600">
                訓練樣本 {modelInfo.training_rows?.toLocaleString()} 筆 · 最新 {modelInfo.latest_quarter}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* 左側：物件條件輸入表單 */}
          <form onSubmit={handlePredict} className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-blue-gray-500 mb-1">縣市</label>
                <select
                  aria-label="估價縣市"
                  className="w-full h-10 px-3 border border-blue-gray-200 rounded-lg text-sm text-blue-gray-700 bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-gray-500 mb-1">行政區</label>
                <select
                  aria-label="估價行政區"
                  className="w-full h-10 px-3 border border-blue-gray-200 rounded-lg text-sm text-blue-gray-700 bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="all">全區（縣市基準）</option>
                  {districts.map((d) => (
                    <option key={d.trim()} value={d.trim()}>
                      {d.trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-gray-500 mb-1">建物型態</label>
                <select
                  aria-label="估價建物型態"
                  className="w-full h-10 px-3 border border-blue-gray-200 rounded-lg text-sm text-blue-gray-700 bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                >
                  {BUILDING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="建物坪數 (坪)"
                type="number"
                step="0.5"
                containerProps={{ className: "!min-w-0" }}
                value={pings}
                onChange={(e) => setPings(e.target.value)}
              />
              <Input
                label="屋齡 (年，可留空)"
                type="number"
                step="0.5"
                containerProps={{ className: "!min-w-0" }}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <Input
                label="車位總價 (萬)"
                type="number"
                step="10"
                containerProps={{ className: "!min-w-0" }}
                value={parkingPrice}
                onChange={(e) => setParkingPrice(e.target.value)}
              />
            </div>

            {errorMsg && (
              <Typography variant="small" color="red" className="text-xs font-semibold">
                {errorMsg}
              </Typography>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                color="indigo"
                size="md"
                disabled={isPredicting}
                className="flex items-center gap-2 font-bold shadow-md"
              >
                <SparklesIcon className="h-4 w-4" />
                {isPredicting ? "AI 運算估價中..." : "開始 AI 估價"}
              </Button>
              <Typography variant="small" className="text-xs text-blue-gray-400">
                可自由調整條件估算任意房屋的合理市場單價與總價區間
              </Typography>
            </div>
          </form>

          {/* 右側：AI 估價結果卡片 */}
          <div className="lg:col-span-5">
            {result ? (
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/70 p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Typography variant="small" className="font-bold text-indigo-900">
                    {result.city}
                    {result.district === "全區" ? "" : result.district} · {result.building_type}
                  </Typography>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-100">
                    信賴度：{result.confidence_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-y border-indigo-100/80 py-3">
                  <div>
                    <Typography variant="small" className="text-xs text-blue-gray-500">
                      AI 預估合理單價
                    </Typography>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <Typography variant="h4" color="indigo" className="font-black">
                        {result.predicted_unit_price.toLocaleString()}
                      </Typography>
                      <Typography variant="small" className="text-xs font-bold text-blue-gray-500">
                        萬/坪
                      </Typography>
                    </div>
                    <Typography variant="small" className="text-[11px] text-blue-gray-500 mt-0.5">
                      合理區間：{result.unit_price_low} ~ {result.unit_price_high} 萬/坪
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="small" className="text-xs text-blue-gray-500">
                      預估含車位總價
                    </Typography>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <Typography variant="h4" color="blue-gray" className="font-black">
                        {Math.round(result.predicted_total_price_wan).toLocaleString()}
                      </Typography>
                      <Typography variant="small" className="text-xs font-bold text-blue-gray-500">
                        萬
                      </Typography>
                    </div>
                    <Typography variant="small" className="text-[11px] text-blue-gray-500 mt-0.5">
                      區間：{Math.round(result.total_price_low_wan).toLocaleString()} ~{" "}
                      {Math.round(result.total_price_high_wan).toLocaleString()} 萬
                    </Typography>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-blue-gray-600">
                    對照區域基準（{result.benchmark_unit_price} 萬/坪）：
                    <strong
                      className={
                        result.vs_benchmark_pct >= 0 ? "text-red-600 ml-1" : "text-green-700 ml-1"
                      }
                    >
                      {result.vs_benchmark_pct >= 0 ? "+" : ""}
                      {result.vs_benchmark_pct}%
                    </strong>
                  </span>

                  {onApplyToMortgage && (
                    <Button
                      variant="outlined"
                      color="indigo"
                      size="sm"
                      onClick={() =>
                        onApplyToMortgage({
                          unitPrice: result.predicted_unit_price,
                          pings: result.building_pings,
                          parkingPrice: result.parking_price,
                        })
                      }
                      className="flex items-center gap-1 py-1 px-2.5 text-[11px] font-bold"
                    >
                      <CalculatorIcon className="h-3.5 w-3.5" />
                      帶入房貸試算
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[172px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 p-6 text-center">
                <SparklesIcon className="mb-2 h-7 w-7 text-indigo-300" />
                <Typography variant="small" color="blue-gray" className="font-bold opacity-70">
                  設定房屋條件後點擊「開始 AI 估價」
                </Typography>
                <Typography variant="small" className="mt-1 text-xs text-blue-gray-400">
                  將立即推估單價、含車位總價與 15%～85% 合理市場行情區間
                </Typography>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

AiValuationCard.displayName = "/src/widgets/cards/ai-valuation-card.jsx";

export default AiValuationCard;
