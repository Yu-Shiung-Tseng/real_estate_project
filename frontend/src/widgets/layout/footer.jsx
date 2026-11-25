import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Typography } from "@material-tailwind/react";
import { HeartIcon } from "@heroicons/react/24/solid";

export function Footer({ brandName, brandLink }) {
  const year = new Date().getFullYear();

  return (
    <footer className="py-4 border-t border-blue-gray-100">
      <div className="flex w-full flex-wrap items-center justify-center gap-4 px-2 md:justify-between">
        {/* 左側：版權與資料來源宣告 */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <Typography variant="small" className="font-normal text-inherit">
            &copy; {year}, made with{" "}
            <HeartIcon className="-mt-0.5 inline-block h-3.5 w-3.5 text-red-600" /> by{" "}
            <a
              href={brandLink}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-blue-500 font-bold"
            >
              {brandName}
            </a>
          </Typography>
          <Typography variant="small" className="text-[11px] text-blue-gray-400">
            資料來源：中華民國內政部不動產交易實價登錄公開資料（所有統計與 AI 預測僅供研究參考）
          </Typography>
        </div>

        {/* 右側：AdSense 審核必備站內政策與說明連結 */}
        <ul className="flex flex-wrap items-center gap-4 text-xs font-medium text-blue-gray-600">
          <li>
            <Link to="/dashboard/about" className="hover:text-blue-600 transition-colors">
              關於本站
            </Link>
          </li>
          <li>
            <Link to="/dashboard/privacy" className="hover:text-blue-600 transition-colors">
              隱私權政策
            </Link>
          </li>
          <li>
            <Link to="/dashboard/terms" className="hover:text-blue-600 transition-colors">
              使用條款與免責聲明
            </Link>
          </li>
          <li>
            <a
              href={brandLink}
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              聯絡開發者
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

Footer.defaultProps = {
  brandName: "Doban Tseng",
  brandLink: "https://github.com/Yu-Shiung-Tseng",
};

Footer.propTypes = {
  brandName: PropTypes.string,
  brandLink: PropTypes.string,
};

Footer.displayName = "/src/widgets/layout/footer.jsx";

export default Footer;
