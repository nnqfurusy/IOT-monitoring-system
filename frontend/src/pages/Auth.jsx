import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const [f, setF] = useState({ fullName: "", username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isLogin && f.password !== f.confirm) return setError("Mật khẩu nhập lại không khớp");
    setBusy(true);
    try {
      if (isLogin) await login({ username: f.username, password: f.password });
      else await register({ fullName: f.fullName, username: f.username, email: f.email, password: f.password });
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand-logo auth-logo">▣</div>
        <h2>{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h2>
        <p className="muted small">Hệ thống giám sát nhiệt độ, độ ẩm, ánh sáng</p>

        {!isLogin && <label className="field"><span>Họ tên</span><input value={f.fullName} onChange={set("fullName")} required /></label>}
        <label className="field"><span>{isLogin ? "Tên đăng nhập hoặc email" : "Tên đăng nhập"}</span><input value={f.username} onChange={set("username")} required autoFocus /></label>
        {!isLogin && <label className="field"><span>Email</span><input type="email" value={f.email} onChange={set("email")} required /></label>}
        <label className="field"><span>Mật khẩu</span><input type="password" value={f.password} onChange={set("password")} required /></label>
        {!isLogin && <label className="field"><span>Nhập lại mật khẩu</span><input type="password" value={f.confirm} onChange={set("confirm")} required /></label>}

        {error && <div className="form-err">{error}</div>}
        <button className="btn-primary btn-block" type="submit" disabled={busy}>{busy ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}</button>

        <div className="muted small auth-switch">
          {isLogin ? <>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></> : <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}
        </div>
      </form>
    </div>
  );
}