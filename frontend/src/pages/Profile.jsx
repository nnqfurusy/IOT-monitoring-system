import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import { useAuth } from "../AuthContext.jsx";

const LINKS = [
  { icon: "🐙", title: "Mã nguồn (Source Code)", url: "https://github.com/nguyenvana/iot-project" },
  { icon: "📄", title: "Báo cáo PDF (PDF Report)", url: "https://report-iot-project.pdf" },
  { icon: "🎨", title: "Thiết kế Figma (Figma Design)", url: "https://figma.com/design/iot-dashboard" },
  { icon: "📘", title: "Thiết kế API (API Documentation)", url: "https://documenter.getpostman.com/view/59280069/2sBYHVvz2o#1189c47e-0e71-4e3f-9e30-3c14bba19ad0" },
];

const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [form, setForm] = useState(user);
  const [msg, setMsg] = useState(null);
  const [pw, setPw] = useState({ oldPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => { setForm(user); }, [user]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    try { await updateProfile(form); setMsg({ ok: true, text: "Đã lưu thông tin" }); }
    catch (err) { setMsg({ ok: false, text: err.message }); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await changePassword(pw); setPw({ oldPassword: "", newPassword: "" }); setPwMsg({ ok: true, text: "Đã đổi mật khẩu" }); }
    catch (err) { setPwMsg({ ok: false, text: err.message }); }
  };

  return (
    <>
      <Header title="Hồ sơ Developer" subtitle="Thông tin thành viên phát triển dự án IoT giám sát môi trường" />
      <div className="profile-grid">
        <div className="card profile-card">
          <h3>Tổng quan hồ sơ</h3>
          {user.avatar ? <img className="avatar" src={user.avatar} alt="avatar" /> : <div className="avatar" />}
          <h2>{user.fullName}</h2>
          <div className="muted small">{user.email}</div>
          <div className="info">
            <div><span>DỰ ÁN HỌC THUẬT</span><b>{user.project || "—"}</b></div>
            <div><span>GIẢNG VIÊN HƯỚNG DẪN</span><b className="blue">{user.teacher || "—"}</b></div>
            <div><span>MÔN HỌC</span><b className="muted">{user.subject || "—"}</b></div>
          </div>
        </div>
        <div className="card">
          <h3>Sản phẩm bàn giao</h3>
          <p className="muted small">Danh sách tài liệu và tài nguyên phục vụ đánh giá đồ án</p>
          {LINKS.map((l) => (
            <a className="link-item" key={l.title} href={l.url} target="_blank" rel="noreferrer">
              <div className="link-icon">{l.icon}</div>
              <div className="link-text"><b>{l.title}</b><span>{l.url.replace("https://", "")}</span></div>
              <span className="ext">↗</span>
            </a>
          ))}
        </div>
      </div>

      <div className="profile-grid" style={{ marginTop: 16 }}>
        <form className="card" onSubmit={save}>
          <h3>Chỉnh sửa thông tin</h3>
          <Field label="Họ tên"><input value={form.fullName} onChange={set("fullName")} required /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={set("email")} required /></Field>
          <Field label="Ảnh đại diện (link http/https)"><input value={form.avatar} onChange={set("avatar")} placeholder="https://..." /></Field>
          <Field label="Dự án học thuật"><input value={form.project} onChange={set("project")} /></Field>
          <Field label="Giảng viên hướng dẫn"><input value={form.teacher} onChange={set("teacher")} /></Field>
          <Field label="Môn học"><input value={form.subject} onChange={set("subject")} /></Field>
          {msg && <div className={msg.ok ? "form-ok" : "form-err"}>{msg.text}</div>}
          <button className="btn-primary btn-block" type="submit">Lưu thay đổi</button>
        </form>

        <form className="card" onSubmit={savePw}>
          <h3>Đổi mật khẩu</h3>
          <Field label="Mật khẩu hiện tại"><input type="password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} required /></Field>
          <Field label="Mật khẩu mới (tối thiểu 6 ký tự)"><input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></Field>
          {pwMsg && <div className={pwMsg.ok ? "form-ok" : "form-err"}>{pwMsg.text}</div>}
          <button className="btn-primary btn-block" type="submit">Đổi mật khẩu</button>
        </form>
      </div>
    </>
  );
}