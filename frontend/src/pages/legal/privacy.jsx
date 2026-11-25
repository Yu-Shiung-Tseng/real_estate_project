import React from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Typography, Button } from "@material-tailwind/react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto mt-6 max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="h4" color="blue-gray" className="font-bold">
          隱私權政策（Privacy Policy）
        </Typography>
        <Link to="/dashboard/home">
          <Button variant="outlined" color="blue-gray" size="sm" className="flex items-center gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" /> 返回房價儀表板
          </Button>
        </Link>
      </div>

      <Card className="border border-blue-gray-100 shadow-sm">
        <CardBody className="flex flex-col gap-5 p-6 md:p-8 text-sm text-blue-gray-700 leading-relaxed">
          <Typography variant="small" className="text-xs text-blue-gray-400">
            最後更新日期：2026 年 11 月 25 日｜適用網站：Taiwan Housing Insight Analytics（https://doban.uk）
          </Typography>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              1. 隱私權保護範圍
            </Typography>
            <p>
              歡迎您使用 <strong>Taiwan Housing Insight Analytics</strong>（以下簡稱「本站」）。本站非常重視您的個人隱私權，本政策說明您在使用本站服務時，我們如何蒐集、處理與保護相關資訊。本政策僅適用於本站網域，不適用於本站以外之外部連結網站。
            </p>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              2. 資料蒐集與伺服器日誌
            </Typography>
            <p>
              本站不要求註冊帳號或填寫個人身分資料即可免費瀏覽與查詢房價大數據。當您瀏覽本站時，伺服器與 CDN（Cloudflare）可能會自動記錄一般連線技術資訊，例如 IP 位址、瀏覽器類型、使用時間及查詢路徑，僅供系統維運、資安防護與流量效能最佳化使用，不會用於識別特定個人身分。
            </p>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              3. Google AdSense 廣告與 Cookie 使用聲明
            </Typography>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                本站採用 <strong>Google AdSense</strong> 作為第三方廣告聯播網服務。包含 Google 在內的第三方供應商會使用 Cookie，根據使用者先前造訪本站或其他網站的紀錄來放送個人化廣告。
              </li>
              <li>
                Google 使用廣告 Cookie（包含 DoubleClick Cookie），讓 Google 及其合作夥伴能依據使用者造訪本站與網際網路上其他網站的紀錄，向使用者顯示更相關的廣告內容。
              </li>
              <li>
                使用者可隨時前往{" "}
                <a
                  href="https://adssettings.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-600 underline"
                >
                  Google 廣告設定（Ads Settings）
                </a>{" "}
                選擇停用個人化廣告，或參閱{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-600 underline"
                >
                  Google 廣告隱私權與條款
                </a>{" "}
                了解更多詳細資訊。您亦可透過瀏覽器設定管理或停用 Cookie。
              </li>
            </ul>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              4. 第三方連結與資料安全
            </Typography>
            <p>
              本站全站透過 HTTPS（TLS）加密傳輸以保障連線安全。若本站頁面包含指向外部網站（如政府資料開放平台、GitHub 或廣告連結）之超連結，其隱私權保護措施悉依該外部網站規定辦理，本站不負擔連帶責任。
            </p>
          </section>

          <section>
            <Typography variant="h6" color="blue-gray" className="mb-2 font-bold">
              5. 政策修訂與聯絡方式
            </Typography>
            <p>
              本站得因應法規變更或服務調整隨時修訂本隱私權政策，修訂後內容將公告於本頁並即時生效。如對本政策有任何疑問，請透過{" "}
              <a
                href="https://github.com/Yu-Shiung-Tseng"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 underline"
              >
                GitHub（Doban Tseng）
              </a>{" "}
              與站長聯繫。
            </p>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}

export default PrivacyPolicyPage;
