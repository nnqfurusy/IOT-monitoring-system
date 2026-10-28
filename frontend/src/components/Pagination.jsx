const LIMITS = [5, 10, 20, 50, 100];

// Phân trang + chọn số dòng mỗi trang (page limit)
export default function Pagination({ page, setPage, total, pageSize, setPageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nums = [];
  for (let i = Math.max(1, page - 1); i <= Math.min(pages, Math.max(3, page + 1)); i++) nums.push(i);

  const changeLimit = (e) => { setPageSize(Number(e.target.value)); setPage(1); };

  return (
    <div className="pagination">
      <div className="pagination-left">
        <span>Đang hiển thị <b>{from}</b> đến <b>{to}</b> trong tổng số <b>{total}</b> bản ghi</span>
        <label className="limit">
          Số dòng/trang
          <select value={pageSize} onChange={changeLimit}>
            {LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="pages">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
        {nums.map((n) => (
          <button key={n} className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
        ))}
        <button disabled={page === pages} onClick={() => setPage(page + 1)}>Sau</button>
        <button disabled={page === pages} onClick={() => setPage(pages)}>Cuối cùng</button>
      </div>
    </div>
  );
}
