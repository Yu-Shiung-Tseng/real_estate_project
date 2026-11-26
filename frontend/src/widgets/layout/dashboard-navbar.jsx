import { Link, useLocation } from "react-router-dom";
import { Navbar, Typography } from "@material-tailwind/react";

const NAV_LINKS = [
  { label: "房價儀表板", to: "/dashboard/home" },
  { label: "解約與賣壓觀察", to: "/dashboard/risk-watch" },
  { label: "關於本站", to: "/dashboard/about" },
  { label: "隱私權政策", to: "/dashboard/privacy" },
  { label: "免責聲明", to: "/dashboard/terms" },
];

export function DashboardNavbar() {
  const { pathname } = useLocation();

  return (
    <Navbar color="transparent" className="px-0 py-2" fullWidth>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <Link to="/dashboard/home" className="group">
          <Typography
            variant="h5"
            color="blue-gray"
            className="font-bold tracking-wide group-hover:text-blue-600 transition-colors"
          >
            台灣房價儀表板
          </Typography>
          <Typography variant="small" className="text-xs text-blue-gray-500 font-normal">
            台灣實價登錄視覺化資料查詢與分析平台（每季同步更新）
          </Typography>
        </Link>

        <nav aria-label="主導覽列" className="flex flex-wrap items-center gap-2">
          {NAV_LINKS.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-blue-gray-600 hover:bg-blue-gray-100/70 hover:text-blue-gray-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </Navbar>
  );
}

DashboardNavbar.displayName = "/src/widgets/layout/dashboard-navbar.jsx";

export default DashboardNavbar;
