import React from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Button } from "@material-tailwind/react";
import {
  ArrowLeftIcon,
  CircleStackIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/solid";

export function AboutPage() {
  return (
    <div className="mx-auto mt-6 max-w-4xl flex flex-col gap-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-slate-800">
            關於本站與資料說明
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            台灣房價儀表板 — 專注於提供更直觀的視覺化房價資料參考
          </p>
        </div>
        <Link to="/dashboard/home">
          <Button variant="outlined" color="blue-gray" size="sm" className="flex items-center gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" /> 返回台灣房價儀表板
          </Button>
        </Link>
      </div>

      <Card className="border border-blue-gray-100 shadow-sm">
        <CardBody className="flex flex-col gap-8 p-6 md:p-10 text-[15px] leading-8 tracking-[0.015em] text-slate-700">
          {/* 建站初衷 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-900 border-l-4 border-blue-500 pl-3">
              平台理念與建站初衷
            </h2>
            <p>
              <strong>台灣房價儀表板</strong>是基於個人興趣獨立打造的公開資料平台（made with personal interests by Doban），初衷是為了讓一般民眾、首購族與關心房市趨勢的朋友，能夠用更直觀、清楚的視覺化圖表來參考台灣歷年不動產成交行情，而不再需要自行整理繁瑣龐大的實價登錄原始檔案。
            </p>
          </section>

          {/* 資料更新頻率說明 */}
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5">
            <div className="mb-2 flex items-center gap-2 text-amber-800">
              <CalendarDaysIcon className="h-5 w-5" />
              <h2 className="text-base font-bold">資料來源與每季更新頻率</h2>
            </div>
            <p className="text-[15px] leading-8 text-slate-700">
              本站所有交易數據均源自<strong>中華民國內政部不動產交易實價登錄公開資料</strong>（涵蓋民國 101 年迄今逾 410 萬筆清洗後交易紀錄）。由於官方季度整批實價登錄資料<strong>每三個月才會釋出一次</strong>，因此<strong>本網站亦配合官方進度，每三個月才會更新一次新一季的資料</strong>。
            </p>
          </section>

          {/* 三大特色卡片 */}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
              <div className="mb-2.5 flex items-center gap-2 text-blue-600">
                <CircleStackIcon className="h-5 w-5 shrink-0" />
                <h3 className="text-[15px] font-bold text-slate-900">官方公開資料來源</h3>
              </div>
              <p className="text-sm leading-7 text-slate-600">
                完整涵蓋台灣 22 縣市與超過 350 個行政區，提供跨年度走勢比較、區域價格熱力圖與可搜尋排序之交易明細。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
              <div className="mb-2.5 flex items-center gap-2 text-indigo-600">
                <ShieldCheckIcon className="h-5 w-5 shrink-0" />
                <h3 className="text-[15px] font-bold text-slate-900">嚴謹資料清洗規則</h3>
              </div>
              <p className="text-sm leading-7 text-slate-600">
                自動排除親友交易、員工優惠等特殊備註案件，以及畸零面積與極端異常單價，讓統計均價更貼近真實市場行情。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
              <div className="mb-2.5 flex items-center gap-2 text-purple-600">
                <CpuChipIcon className="h-5 w-5 shrink-0" />
                <h3 className="text-[15px] font-bold text-slate-900">統計模型與趨勢參考</h3>
              </div>
              <p className="text-sm leading-7 text-slate-600">
                結合季節性時間序列趨勢模型與梯度提升樹（HistGradientBoosting）估價模型，提供未來 4 季趨勢區間與單戶行情試算。
              </p>
            </div>
          </section>

          {/* 模型方法 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">
              數據模型方法說明
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-[15px] leading-8 text-slate-700">
              <li>
                <strong>未來 4 季房價走勢推估：</strong>
                依據選定縣市、行政區、屋齡與建物型態，擷取近 7 年歷史季度均價與成交量，以指數時間遞減加權搭配季度週期特徵與阻尼趨勢建立 Ridge 迴歸模型，並對交易量較少行政區導入縣市平滑縮減，輸出未來 4 季預估單價、80% 預測區間與回測誤差（MAPE）。
              </li>
              <li>
                <strong>單戶行情試算模型：</strong>
                以近代數十萬筆實價登錄資料訓練 <code>HistGradientBoostingRegressor</code> 模型，整合縣市、行政區、建物型態、坪數、屋齡與區域行情基準，並以最新一季樣本外交易驗證誤差與 15%～85% 合理行情區間。
              </li>
            </ul>
          </section>

          {/* 網站維運與廣告聲明 */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-800">
              <MegaphoneIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold">關於網站維運與廣告</h2>
            </div>
            <p className="text-[15px] leading-8 text-slate-700">
              <strong>本網站沒有任何商業贊助</strong>，亦不與任何建商或房仲業者合作推薦物件；頁面上放置 Google 廣告僅是為了支付網域續約、硬體電力與架設網站的基本維運成本，感謝您的理解與支持。
            </p>
          </section>

          {/* 聯絡方式 */}
          <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <div className="mb-2 flex items-center gap-2 text-blue-800">
              <EnvelopeIcon className="h-5 w-5" />
              <h2 className="text-base font-bold">聯絡站長</h2>
            </div>
            <p className="text-[15px] leading-8 text-slate-700">
              如果您對本站的資料呈現、功能改善建議或任何問題想交流，歡迎直接寄信至：{" "}
              <a
                href="mailto:a0977455870@gmail.com"
                className="font-bold text-blue-700 underline underline-offset-4 hover:text-blue-900"
              >
                a0977455870@gmail.com
              </a>
            </p>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}

export default AboutPage;
