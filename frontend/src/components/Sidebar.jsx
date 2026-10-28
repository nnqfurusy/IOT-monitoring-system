import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

const items = [
  { to: "/", label: "Dashboard", icon: "▦", end: true },
  { to: "/data-sensor", label: "Data Sensor", icon: "📊" },
  { to: "/action-history", label: "Action History", icon: "🕘" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">▣</div>
        <span>Hệ thống giám sát nhiệt độ, độ ẩm, ánh sáng</span>
      </div>
      <nav>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="side-user">
        <b title={user.email}>{user.fullName}</b>
        <span className="muted small">@{user.username}</span>
        <button className="btn-logout" onClick={logout}>Đăng xuất</button>
      </div>
    </aside>
  );
}