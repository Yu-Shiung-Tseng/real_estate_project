import PropTypes from "prop-types";
import { Link, NavLink } from "react-router-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Button,
  IconButton,
  Typography,
} from "@material-tailwind/react";
import { useMaterialTailwindController, setOpenSidenav } from "@/context";

export function Sidenav({ routes }) {
  const [controller, dispatch] = useMaterialTailwindController();
  const { sidenavColor, sidenavType, openSidenav } = controller;
  const sidenavTypes = {
    dark: "bg-gradient-to-br from-gray-800 to-gray-900",
    white: "bg-white shadow-sm",
    transparent: "bg-transparent",
  };

  return (
    <aside
      className={`${sidenavTypes[sidenavType]} ${
        openSidenav ? "translate-x-0" : "-translate-x-80"
      } fixed inset-0 z-50 my-4 ml-4 h-[calc(100vh-32px)] w-72 rounded-xl transition-transform duration-300 xl:translate-x-0 border border-blue-gray-100/50`}
    >
      <div className={`relative`}>
        <Link to="/" className="py-6 px-8 block text-center">
          {/* ⚠️ 需求 1：將左上角網頁標題修改為指定名稱 */}
          <Typography
            variant="h6"
            color={sidenavType === "dark" ? "white" : "blue-gray"}
            className="whitespace-normal leading-snug tracking-wide"
          >
            Taiwan Housing <br /> Insight Analytics
          </Typography>
        </Link>
        <IconButton
          variant="text"
          color="white"
          size="sm"
          ripple={false}
          className="absolute right-0 top-0 grid rounded-br-none rounded-tl-none xl:hidden"
          onClick={() => setOpenSidenav(dispatch, false)}
        >
          <XMarkIcon strokeWidth={2.5} className="h-5 w-5 text-white" />
        </IconButton>
      </div>
      
      <div className="m-4 overflow-y-auto h-[calc(100vh-160px)]">
        {routes.map(({ layout, pages }, key) => (
          <ul key={key} className="mb-4 flex flex-col gap-1">
            {pages.map(({ icon, name, path }) => (
              <li key={name}>
                <NavLink to={`/${layout}${path}`}>
                  {({ isActive }) => (
                    <Button
                      variant={isActive ? "gradient" : "text"}
                      color={
                        isActive
                          ? sidenavColor
                          : sidenavType === "dark"
                          ? "white"
                          : "blue-gray"
                      }
                      className="flex items-center gap-4 px-4 capitalize"
                      fullWidth
                    >
                      {icon}
                      <Typography
                        color="inherit"
                        className="font-medium capitalize"
                      >
                        {name}
                      </Typography>
                    </Button>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        ))}

        {/* ========================================== */}
        {/* ⚠️ 需求 2：已將原先位於此處的 Material Tailwind */}
        {/* 廣告、Documentation、Upgrade 藍色區塊完整移除 */}
        {/* ========================================== */}

      </div>
    </aside>
  );
}

Sidenav.defaultProps = {
  routes: [],
};

Sidenav.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object),
};

Sidenav.displayName = "/src/widgets/layout/sidenav.jsx";

export default Sidenav;