import { Routes, Route } from "react-router-dom";
import { DashboardNavbar, Footer } from "@/widgets/layout";
import routes from "@/routes";

export function Dashboard() {
  return (
    <div className="min-h-screen bg-blue-gray-50/50">
      {/* ⚠️ 需求 1：已將左側 <Sidenav /> 完全移除 */}

      {/* ⚠️ 修正：將原先移開側邊欄用的 xl:ml-80 拔除，使其回復為全畫面寬度 */}
      <div className="p-4 min-h-screen flex flex-col justify-between">
        <div>
          <DashboardNavbar />
          <div className="mt-4">
            <Routes>
              {routes.map(
                ({ layout, pages }) =>
                  layout === "dashboard" &&
                  pages.map(({ path, element }) => (
                    <Route exact path={path} element={element} />
                  ))
              )}
            </Routes>
          </div>
        </div>
        <div className="text-blue-gray-600 mt-12">
          <Footer />
        </div>
      </div>

    </div>
  );
}

export default Dashboard;