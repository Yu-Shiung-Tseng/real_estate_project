import {
  HomeIcon,
  UserCircleIcon,
  TableCellsIcon,
  InformationCircleIcon,
  ServerStackIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";
import { Home, RiskWatchPage, Profile, Tables, Notifications } from "@/pages/dashboard";
import { AboutPage, PrivacyPolicyPage, TermsDisclaimerPage } from "@/pages/legal";
import { SignIn, SignUp } from "@/pages/auth";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <Home />,
      },
      {
        icon: <InformationCircleIcon {...icon} />,
        name: "risk-watch",
        path: "/risk-watch",
        element: <RiskWatchPage />,
      },
      {
        icon: <InformationCircleIcon {...icon} />,
        name: "about",
        path: "/about",
        element: <AboutPage />,
      },
      {
        icon: <InformationCircleIcon {...icon} />,
        name: "privacy",
        path: "/privacy",
        element: <PrivacyPolicyPage />,
      },
      {
        icon: <InformationCircleIcon {...icon} />,
        name: "terms",
        path: "/terms",
        element: <TermsDisclaimerPage />,
      },
      /* ⚠️ 已隱藏其餘功能頁面
      {
        icon: <UserCircleIcon {...icon} />,
        name: "profile",
        path: "/profile",
        element: <Profile />,
      },
      {
        icon: <TableCellsIcon {...icon} />,
        name: "tables",
        path: "/tables",
        element: <Tables />,
      },
      {
        icon: <InformationCircleIcon {...icon} />,
        name: "notifications",
        path: "/notifications",
        element: <Notifications />,
      },
      */
    ],
  },
  /* ⚠️ 已隱藏登入與註冊頁面選單
  {
    title: "auth pages",
    layout: "auth",
    pages: [
      {
        icon: <ServerStackIcon {...icon} />,
        name: "sign in",
        path: "/sign-in",
        element: <SignIn />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "sign up",
        path: "/sign-up",
        element: <SignUp />,
      },
    ],
  },
  */
];

export default routes;