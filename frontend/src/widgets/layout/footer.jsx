import PropTypes from "prop-types";
import { Typography } from "@material-tailwind/react";
import { HeartIcon } from "@heroicons/react/24/solid";

export function Footer({ brandName, brandLink }) {
  const year = new Date().getFullYear();

  return (
    <footer className="py-2">
      <div className="flex w-full flex-wrap items-center justify-center gap-6 px-2 md:justify-between">
        
        {/* 左側：版權與名稱宣告（含 GitHub 連結） */}
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

        {/* 右側選單保持清空狀態 */}
      </div>
    </footer>
  );
}

// 設定預設名稱與 GitHub 連結
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