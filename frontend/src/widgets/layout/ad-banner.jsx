import React from "react";
import { Card, CardBody, Typography } from "@material-tailwind/react";

/**
 * 符合 Google AdSense 政策的頁面內嵌橫幅廣告元件。
 * （Google AdSense 禁止將廣告置於遮擋內容的彈出式視窗中，因此改採自然嵌入版面之橫幅位）
 *
 * 啟用步驟：
 * 1. 於 frontend/index.html 取消註解 AdSense <script> 並填入 ca-pub-XXXXXXXXXXXXXXXX。
 * 2. 取消註解下方 <ins className="adsbygoogle" ... /> 與 useEffect 中的 push({}) 呼叫，並填入 data-ad-slot。
 */
export function AdBanner({ slotName = "橫幅廣告版位" }) {
  /*
   * React.useEffect(() => {
   *   try {
   *     (window.adsbygoogle = window.adsbygoogle || []).push({});
   *   } catch (err) {
   *     console.error("AdSense banner render error:", err);
   *   }
   * }, []);
   */

  return (
    <Card className="border border-blue-gray-100 shadow-sm bg-white">
      <CardBody className="py-3 px-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded bg-blue-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-gray-600">
            Advertisement · 網站維運廣告
          </span>
          <Typography variant="small" className="text-[11px] text-blue-gray-400">
            本站無商業贊助，廣告收益僅供支付架站成本
          </Typography>
        </div>

        <div className="flex min-h-[96px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-blue-gray-200 bg-blue-gray-50/40 px-4 py-4 text-center">
          {/*
            審核通過後請移除下方佔位文字並取消註解此 <ins> 區塊，並填入後台產生的 data-ad-slot：
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%" }}
              data-ad-client="ca-pub-7081505201679474"
              data-ad-slot="XXXXXXXXXX"
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          */}
          <Typography variant="small" color="blue-gray" className="font-semibold opacity-70">
            {slotName}（Google AdSense Responsive Banner）
          </Typography>
          <Typography variant="small" className="mt-0.5 text-xs text-blue-gray-400">
            待申請核准後將於此處自動顯示自適應橫幅廣告，不干擾圖表與明細閱讀
          </Typography>
        </div>
      </CardBody>
    </Card>
  );
}

AdBanner.displayName = "/src/widgets/layout/ad-banner.jsx";

export default AdBanner;
