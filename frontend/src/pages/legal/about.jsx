import React from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Typography, Button } from "@material-tailwind/react";
import {
  ArrowLeftIcon,
  CircleStackIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/solid";

export function AboutPage() {
  return (
    <div className="mx-auto mt-6 max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="h4" color="blue-gray" className="font-bold">
          關於本站與數據分析方法
        </Typography>
        <Link to="/dashboard/home">
          <Button variant="outlined" color="blue-gray" size="sm" className="flex items-center gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" /> 返回房價儀表板
          </Button>
        </Link>
      </div>

      <Card className="border border-blue-gray-100 shadow-sm">
        <CardBody className="flex flex-col gap-6 p-6 md:p-8 text-blue-gray-700 leading-relaxed">
          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              平台理念
            </Typography>
            <Typography variant="paragraph" className="text-sm text-blue-gray-700">
              <strong>Taiwan Housing Insight Analytics（台灣房價大數據分析與 AI 估價平台）</strong>
              致力於將龐雜的不動產交易公開資料轉化為直覺、透明且可互動的視覺化儀表板與機器學習模型，協助購屋族、研究人員與一般民眾快速掌握台灣 22 縣市、超過 350 個行政區的長期房價結構、成交量變化與行情區間。
            </Typography>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-blue-gray-100 bg-blue-gray-50/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-blue-600">
                <CircleStackIcon className="h-5 w-5" />
                <Typography variant="small" className="font-bold text-blue-gray-800">
                  官方公開資料來源
                </Typography>
              </div>
              <Typography variant="small" className="text-xs leading-relaxed text-blue-gray-600">
                資料全數源自中華民國內政部不動產交易實價登錄公開資料集（涵蓋民國 101 年迄今逾 410 萬筆清洗後交易紀錄），並定期增量更新。
              </Typography>
            </div>

            <div className="rounded-xl border border-blue-gray-100 bg-blue-gray-50/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-indigo-600">
                <ShieldCheckIcon className="h-5 w-5" />
                <Typography variant="small" className="font-bold text-blue-gray-800">
                  嚴謹資料清洗規則
                </Typography>
              </div>
              <Typography variant="small" className="text-xs leading-relaxed text-blue-gray-600">
                自動剔除親友交易、員工優惠等特殊交易備註，以及畸零面積、異常單價等極端雜訊，使統計均價更貼近一般市場實際成交行情。
              </Typography>
            </div>

            <div className="rounded-xl border border-blue-gray-100 bg-blue-gray-50/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-purple-600">
                <CpuChipIcon className="h-5 w-5" />
                <Typography variant="small" className="font-bold text-blue-gray-800">
                  雙引擎 AI 模型架構
                </Typography>
              </div>
              <Typography variant="small" className="text-xs leading-relaxed text-blue-gray-600">
                結合「時間加權季節性 Ridge 走勢預測模型」與「HistGradientBoosting 單戶行情估價模型」，同時提供未來 4 季趨勢預測區間與條件式智慧估價。
              </Typography>
            </div>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              機器學習模型技術說明
            </Typography>
            <ul className="list-disc pl-5 space-y-2 text-sm text-blue-gray-700">
              <li>
                <strong>未來 4 季房價走勢預測：</strong>
                針對使用者篩選的縣市、行政區、屋齡與建物型態，擷取近 7 年歷史季度均價與成交量，以指數時間遞減加權（近期市場權重較高）搭配季節週期特徵與阻尼趨勢建立 Ridge 迴歸模型，並對成交量偏少之行政區套用縣市層級平滑縮減（Shrinkage），輸出未來 4 季預測單價、80% 預測區間與滾動回測誤差（MAPE）。
              </li>
              <li>
                <strong>AI 單戶智慧估價：</strong>
                以近代數十萬筆實價登錄交易訓練 <code>HistGradientBoostingRegressor</code>（對數單價梯度提升樹），納入縣市、行政區、建物型態、建物坪數、屋齡與階層平滑區域基準等特徵，並以時間序樣本外驗證集（Out-of-Time Validation）校準 15%～85% 合理行情區間。
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-1 flex items-center gap-2 text-blue-800">
              <EnvelopeIcon className="h-4 w-4" />
              <Typography variant="small" className="font-bold">
                聯絡與回饋
              </Typography>
            </div>
            <Typography variant="small" className="text-xs text-blue-gray-700">
              本站由 Doban Tseng 獨立開發與維護（網域：<code>https://doban.uk</code>）。如對數據呈現、功能建議或合作有任何問題，歡迎透過{" "}
              <a
                href="https://github.com/Yu-Shiung-Tseng"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 underline"
              >
                GitHub 專案主頁
              </a>{" "}
              與我們聯繫。
            </Typography>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}

export default AboutPage;
