import React from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Button } from "@material-tailwind/react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

export function TermsDisclaimerPage() {
  return (
    <div className="mx-auto mt-6 max-w-4xl flex flex-col gap-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-slate-800">
            使用條款與免責聲明
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            台灣房價儀表板資料更新週期與使用須知
          </p>
        </div>
        <Link to="/dashboard/home">
          <Button variant="outlined" color="blue-gray" size="sm" className="flex items-center gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" /> 返回台灣房價儀表板
          </Button>
        </Link>
      </div>

      <Card className="border border-blue-gray-100 shadow-sm">
        <CardBody className="flex flex-col gap-6 p-6 md:p-10 text-[15px] leading-8 tracking-[0.015em] text-slate-700">
          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">1. 資料來源與每季更新說明</h2>
            <p>
              <strong>台灣房價儀表板</strong>展示之不動產交易統計、走勢圖表與交易明細，均彙整自中華民國內政部不動產交易實價登錄公開資料，並經由自動化程序清洗與統計計算。由於內政部季度整批實價登錄資料<strong>每三個月釋出一次</strong>，因此本網站亦<strong>每三個月更新一次新一季資料</strong>。受限於官方原始申報時間差、欄位缺漏或清洗門檻差異，本站不對資料之絕對即時性與完整性作任何明示或默示保證。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">2. 趨勢推估與行情試算免責聲明</h2>
            <p>
              本站提供之未來 4 季房價走勢預測、單戶智慧行情估價及房貸月付試算結果，係基於歷史實價登錄資料與統計／機器學習演算法推估之數值模型，<strong>僅供視覺化資料參考與市場趨勢研究之用，絕不構成任何不動產買賣、投資理財、貸款決策或正式鑑價建議</strong>。實際房屋價值受個別屋況、樓層、座向、裝潢、社區管理、總體經濟與政策法規影響甚鉅，請務必自行審慎評估並諮詢專業不動產估價師或金融機構。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">3. 合理使用與智慧財產權</h2>
            <p>
              使用者應以合法、合理方式存取本站介面與公開圖表，不得對本站伺服器進行惡意爬蟲、阻斷服務攻擊（DoS）或未經授權之商業轉載。本站介面設計、程式碼與視覺化呈現之著作權歸站長（Doban）所有；原始實價登錄數據之權利歸屬中華民國內政部開放資料授權條款。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">4. 責任限制與聯絡方式</h2>
            <p>
              因使用或無法使用本站提供之數據、圖表、估價試算或外部廣告連結所衍生之任何直接或間接損失，本站及開發者概不負任何賠償責任。如有任何問題，請聯繫{" "}
              <a
                href="mailto:a0977455870@gmail.com"
                className="font-bold text-blue-700 underline underline-offset-4"
              >
                a0977455870@gmail.com
              </a>
              。
            </p>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}

export default TermsDisclaimerPage;
