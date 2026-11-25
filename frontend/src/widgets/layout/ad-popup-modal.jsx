import React, { useState, useEffect } from "react";
import { Typography, Button } from "@material-tailwind/react";
import { XMarkIcon } from "@heroicons/react/24/solid";

const POPUP_DELAY_MS = 3000;

export function AdPopupModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  /*
   * Google AdSense 啟用說明：
   * 1. 先於 frontend/index.html 取消註解並填入您的 ca-pub-XXXXXXXXXXXXXXXX。
   * 2. 於下方廣告容器取消註解 <ins className="adsbygoogle" ... /> 並填入您的 data-ad-client 與 data-ad-slot。
   * 3. 取消註解下方 useEffect，於彈窗開啟時觸發 AdSense 渲染廣告單元：
   *
   * useEffect(() => {
   *   if (!isOpen) return;
   *   try {
   *     (window.adsbygoogle = window.adsbygoogle || []).push({});
   *   } catch (err) {
   *     console.error("AdSense render error:", err);
   *   }
   * }, [isOpen]);
   */

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-popup-label"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-blue-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between px-5 py-3 bg-blue-gray-50/70 border-b border-blue-gray-100">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-gray-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-gray-700">
              AD
            </span>
            <Typography
              id="ad-popup-label"
              variant="small"
              color="blue-gray"
              className="font-semibold text-xs"
            >
              贊助內容
            </Typography>
          </div>
          <button
            type="button"
            aria-label="關閉廣告"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-blue-gray-500 hover:bg-blue-gray-100 hover:text-blue-gray-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 廣告內容容器 (預留給 Google AdSense <ins> 單元) */}
        <div className="p-5">
          <div className="flex min-h-[250px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-gray-200 bg-blue-gray-50/40 p-6 text-center">
            {/*
              待啟用 Google AdSense 時，請移除上方提示內容並取消註解以下 <ins> 區塊：
              <ins
                className="adsbygoogle"
                style={{ display: "block", width: "100%", minHeight: "250px" }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="XXXXXXXXXX"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            */}
            <Typography variant="h6" color="blue-gray" className="mb-1 opacity-70">
              Google AdSense 廣告版位
            </Typography>
            <Typography variant="small" className="text-xs text-blue-gray-400">
              300 × 250 / Responsive Ad Unit Placeholder
            </Typography>
          </div>
        </div>

        {/* 底部關閉按鈕 */}
        <div className="flex justify-end px-5 pb-5">
          <Button
            variant="outlined"
            color="blue-gray"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="font-bold border-blue-gray-200 hover:bg-blue-gray-50"
          >
            關閉廣告
          </Button>
        </div>
      </div>
    </div>
  );
}

AdPopupModal.displayName = "/src/widgets/layout/ad-popup-modal.jsx";

export default AdPopupModal;
