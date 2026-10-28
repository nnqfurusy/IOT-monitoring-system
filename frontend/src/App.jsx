import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DataSensor from "./pages/DataSensor.jsx";
import ActionHistory from "./pages/ActionHistory.jsx";
import Profile from "./pages/Profile.jsx";
import Auth from "./pages/Auth.jsx";
import { ConnectionProvider } from "./ConnectionContext.jsx";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-wrap muted">Đang tải...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-sensor" element={<DataSensor />} />
          <Route path="/action-history" element={<ActionHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConnectionProvider>
        <AppRoutes />
      </ConnectionProvider>
    </AuthProvider>
  );
}