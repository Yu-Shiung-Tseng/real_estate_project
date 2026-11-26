import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Typography } from "@material-tailwind/react";

export function Footer({ brandName, contactEmail }) {
  const year = new Date().getFullYear();

  return (
    <footer className="py-5 border-t border-blue-gray-100">
      <div className="flex w-full flex-wrap items-center justify-center gap-4 px-2 md:justify-between">
        {/* 左側：版權宣告、更新頻率與無贊助聲明 */}
        <div className="flex flex-col items-center md:items-start gap-1.5 text-center md:text-left">
          <Typography variant="small" className="font-normal text-blue-gray-700">
            &copy; {year}, made with personal interests by{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="transition-colors hover:text-blue-600 font-bold"
            >
              {brandName}
            </a>
          </Typography>
          <Typography variant="small" className="text-xs text-blue-gray-500">
            資料來源：中華民國內政部實價登錄公開資料（每三個月釋出一次，本網站亦每三個月更新一次新一季資料）
          </Typography>
          <Typography variant="small" className="text-xs text-blue-gray-400">
            本網站沒有任何商業贊助，刊登廣告僅為了支付架設網站與網域之維運成本。
          </Typography>
        </div>

        {/* 右側：站內說明、政策與聯絡方式 */}
        <ul className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-blue-gray-600">
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
              href={`mailto:${contactEmail}`}
              className="hover:text-blue-600 transition-colors"
            >
              聯絡我們：{contactEmail}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

Footer.defaultProps = {
  brandName: "Doban",
  contactEmail: "a0977455870@gmail.com",
};

Footer.propTypes = {
  brandName: PropTypes.string,
  contactEmail: PropTypes.string,
};

Footer.displayName = "/src/widgets/layout/footer.jsx";

export default Footer;
