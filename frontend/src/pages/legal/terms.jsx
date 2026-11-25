import React from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Typography, Button } from "@material-tailwind/react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

export function TermsDisclaimerPage() {
  return (
    <div className="mx-auto mt-6 max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="h4" color="blue-gray" className="font-bold">
          使用條款與免責聲明
        </Typography>
        <Link to="/dashboard/home">
          <Button variant="outlined" color="blue-gray" size="sm" className="flex items-center gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" /> 返回房價儀表板
          </Button>
        </Link>
      </div>

      <Card className="border border-blue-gray-100 shadow-sm">
        <CardBody className="flex flex-col gap-5 p-6 md:p-8 text-sm text-blue-gray-700 leading-relaxed">
          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              1. 資料來源與正確性聲明
            </Typography>
            <p>
              本站展示之台灣不動產交易統計、走勢圖表與交易明細，均彙整自中華民國內政部不動產交易實價登錄公開資料，並經由自動化程序清洗與統計計算。雖力求資料完整與準確，但仍可能受限於官方原始申報時間差、欄位缺漏或清洗門檻差異，本站不對資料之絕對即時性與完整性作任何明示或默示保證。
            </p>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              2. AI 預測與估價模型免責聲明
            </Typography>
            <p>
              本站提供之「AI 未來 4 季房價走勢預測」、「AI 單戶智慧估價」及「房貸月付試算」結果，係基於歷史統計資料與機器學習演算法推估之數值模型，<strong>僅供資訊參考與市場趨勢研究之用，絕不構成任何不動產買賣、投資理財、貸款決策或正式鑑價建議</strong>。實際房屋價值受個別屋況、樓層、座向、裝潢、社區管理、總體經濟與政策法規影響甚鉅，請務必自行審慎評估並諮詢專業不動產估價師或金融機構。
            </p>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              3. 合理使用與智慧財產權
            </Typography>
            <p>
              使用者應以合法、合理方式存取本站介面與公開圖表，不得對本站伺服器進行惡意爬蟲、阻斷服務攻擊（DoS）或未經授權之商業轉載。本站介面設計、程式碼與視覺化呈現之著作權歸開發者所有；原始實價登錄數據之權利歸屬中華民國內政部開放資料授權條款。
            </p>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              4. 責任限制
            </Typography>
            <p>
              因使用或無法使用本站提供之數據、圖表、估價試算或外部廣告連結所衍生之任何直接或間接損失，本站及開發者概不負任何賠償責任。
            </p>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}

export default TermsDisclaimerPage;
