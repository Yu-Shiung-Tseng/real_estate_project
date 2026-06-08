import { Navbar, Typography } from "@material-tailwind/react";

export function DashboardNavbar() {
  return (
    <Navbar
      color="transparent"
      className="px-0 py-2"
      fullWidth
    >
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          {/* ⚠️ 需求 2：已完全移除 dashboard / home 的路徑提示與副標題 */}
          {/* 💡 轉化：將其改為美觀的平台標題，作為網頁大橫幅 */}
          <Typography variant="h5" color="blue-gray" className="font-bold tracking-wide">
            Taiwan Housing Insight Analytics
          </Typography>
        </div>
        
        <div className="flex items-center">
          {/* 右上角搜尋框與按鈕已全部清空 */}
        </div>
      </div>
    </Navbar>
  );
}

DashboardNavbar.displayName = "/src/widgets/layout/dashboard-navbar.jsx";

export default DashboardNavbar;