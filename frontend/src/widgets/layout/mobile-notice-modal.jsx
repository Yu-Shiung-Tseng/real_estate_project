import React, { useState, useEffect } from "react";
import { Typography, Button } from "@material-tailwind/react";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";

const MOBILE_BREAKPOINT = 768;

export function MobileNoticeModal() {
  const [isSmallScreen, setIsSmallScreen] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isSmallScreen || isDismissed) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-notice-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-blue-gray-100 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <ComputerDesktopIcon className="h-8 w-8" />
        </div>

        <Typography
          id="mobile-notice-title"
          variant="h5"
          color="blue-gray"
          className="mb-3 font-bold"
        >
          建議使用平板或桌機瀏覽
        </Typography>

        <Typography
          variant="small"
          className="mb-6 leading-relaxed text-blue-gray-600 font-normal"
        >
          為求最佳大數據圖表與明細瀏覽體驗，本網站目前僅支援平板與桌機版解析度（建議螢幕寬度 768px 以上）。
        </Typography>

        <Button
          color="blue"
          size="md"
          fullWidth
          onClick={() => setIsDismissed(true)}
          className="text-sm font-bold shadow-md"
        >
          仍要繼續瀏覽
        </Button>
      </div>
    </div>
  );
}

MobileNoticeModal.displayName = "/src/widgets/layout/mobile-notice-modal.jsx";

export default MobileNoticeModal;
