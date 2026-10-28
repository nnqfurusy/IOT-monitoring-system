import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Pagination from "../components/Pagination.jsx";
import { api } from "../api.js";

const tagClass = { "Nhiệt độ": "tag-temp", "Độ ẩm": "tag-hum", "Ánh sáng": "tag-light" };
const SEARCH_BY = ["Tất cả", "Nhiệt độ", "Độ ẩm", "Ánh sáng", "Thời gian"];
const PLACEHOLDER = {
  "Tất cả": "Tìm theo ID, loại cảm biến, giá trị, thời gian...",
  "Nhiệt độ": "Nhập giá trị nhiệt độ, ví dụ 28.5",
  "Độ ẩm": "Nhập giá trị độ ẩm, ví dụ 65",
  "Ánh sáng": "Nhập giá trị ánh sáng, ví dụ 450",
  "Thời gian": "Nhập thời gian, ví dụ 2026-03-30 14:20",
};

export default function DataSensor() {
  const [input, setInput] = useState("");
  const [by, setBy] = useState("Tất cả");
  const [applied, setApplied] = useState({ q: "", by: "Tất cả" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const search = () => { setApplied({ q: input.trim(), by }); setPage(1); };

  // Gọi API backend: tìm trong MySQL theo kiểu dữ liệu đã chọn
  useEffect(() => {
    api("/sensors/history?" + new URLSearchParams({ ...applied, page, pageSize }))
      .then((d) => { setRows(d.rows); setTotal(d.total); })
      .catch(() => { setRows([]); setTotal(0); });
  }, [applied, page, pageSize]);

  return (
    <>
      <Header title="Lịch sử dữ liệu cảm biến" subtitle="Tra cứu và xuất bản ghi lịch sử của toàn bộ hệ thống cảm biến" />
      <div className="toolbar">
        <input className="search" placeholder={PLACEHOLDER[by]} value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <div className="select-box">
          <label>TÌM THEO</label>
          <select value={by} onChange={(e) => setBy(e.target.value)}>
            {SEARCH_BY.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={search}>Tìm kiếm</button>
      </div>

      <div className="card table-card">
        <table>
          <thead><tr><th>ID</th><th>Loại cảm biến</th><th>Giá trị</th><th>Thời gian ghi nhận</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.id}</b></td>
                <td><span className={"tag " + tagClass[r.type]}>{r.type}</span></td>
                <td><b>{r.value}</b></td>
                <td className="muted">{r.time}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="empty">Không tìm thấy dữ liệu</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} setPage={setPage} total={total} pageSize={pageSize} setPageSize={setPageSize} />
      </div>
    </>
  );
}
