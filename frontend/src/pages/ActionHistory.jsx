import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Pagination from "../components/Pagination.jsx";
import { api } from "../api.js";

const statusClass = { "THÀNH CÔNG": "tag-hum", "THẤT BẠI": "tag-temp", TIMEOUT: "tag-light" };
const EMPTY = { q: "", device: "", action: "", status: "" };

function Filter({ label, value, onChange, options }) {
  return (
    <div className="select-box">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Tất cả</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function ActionHistory() {
  const [form, setForm] = useState(EMPTY);       // đang nhập
  const [applied, setApplied] = useState(EMPTY); // đã bấm Tìm kiếm
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const search = () => { setApplied({ ...form, q: form.q.trim() }); setPage(1); };

  // Gọi API backend: tìm kiếm + lọc thiết bị / hành động / trạng thái trong MySQL
  useEffect(() => {
    api("/actions?" + new URLSearchParams({ ...applied, page, pageSize }))
      .then((d) => { setRows(d.rows); setTotal(d.total); })
      .catch(() => { setRows([]); setTotal(0); });
  }, [applied, page, pageSize]);

  return (
    <>
      <Header title="Lịch sử hoạt động" subtitle="Theo dõi toàn bộ nhật ký thao tác điều khiển thiết bị phần cứng trong thời gian thực" />
      <div className="toolbar">
        <input className="search" placeholder="Tìm theo ID, thiết bị, thao tác, trạng thái, thời gian (2026-03-30 14:22:10)..." value={form.q}
          onChange={(e) => set("q")(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <Filter label="THIẾT BỊ" value={form.device} onChange={set("device")} options={["LED 01", "LED 02"]} />
        <Filter label="HÀNH ĐỘNG" value={form.action} onChange={set("action")} options={["BẬT", "TẮT"]} />
        <Filter label="TRẠNG THÁI" value={form.status} onChange={set("status")} options={["THÀNH CÔNG", "THẤT BẠI", "TIMEOUT"]} />
        <button className="btn-primary" onClick={search}>Tìm kiếm</button>
      </div>

      <div className="card table-card">
        <table>
          <thead><tr><th>ID</th><th>Tên thiết bị</th><th>Thao tác</th><th>Trạng thái</th><th>Thời gian thực hiện</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.id}</b></td>
                <td>{r.device}</td>
                <td><span className={"tag " + (r.action === "BẬT" ? "tag-hum" : "tag-gray")}>{r.action}</span></td>
                <td><span className={"tag " + statusClass[r.status]}>{r.status}</span></td>
                <td className="muted">{r.time}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">Không tìm thấy dữ liệu</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} setPage={setPage} total={total} pageSize={pageSize} setPageSize={setPageSize} />
      </div>
    </>
  );
}
