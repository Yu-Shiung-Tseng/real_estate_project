import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard, Auth } from "@/layouts";
import { MobileNoticeModal } from "@/widgets/layout";

function App() {
  return (
    <>
      <MobileNoticeModal />
      <Routes>
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/about" element={<Navigate to="/dashboard/about" replace />} />
        <Route path="/privacy" element={<Navigate to="/dashboard/privacy" replace />} />
        <Route path="/terms" element={<Navigate to="/dashboard/terms" replace />} />
        <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
      </Routes>
    </>
  );
}

export default App;
