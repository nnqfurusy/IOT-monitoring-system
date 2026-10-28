import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../components/Header.jsx";
import { api } from "../api.js";
import { useConnection } from "../ConnectionContext.jsx";

// Lưu lần đo gần nhất trong trình duyệt để mở lại trang là có số ngay, không bị trống/nhấp nháy
const CACHE_KEY = "smartiot_last_chart";
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch { return []; } };

const C = { temp: "#ff5c8a", hum: "#2dd4bf", light: "#fde047" };

const VIS_KEY = "smartiot_chart_visible";
const readVis = () => {
  try { return { temp: true, hum: true, light: true, ...JSON.parse(localStorage.getItem(VIS_KEY)) }; }
  catch { return { temp: true, hum: true, light: true }; }
};
const LINES = [
  { key: "temp", label: "Nhiệt độ (°C)", color: C.temp },
  { key: "hum", label: "Độ ẩm (%)", color: C.hum },
  { key: "light", label: "Ánh sáng (Lux)", color: C.light },
];

export default function Dashboard() {
  const { online } = useConnection();
  const [chart, setChart] = useState(readCache);
  const [leds, setLeds] = useState({ LED01: false, LED02: false });
  const [loading, setLoading] = useState({}); // đèn đang chờ phản hồi
  const [failed, setFailed] = useState({});   // đèn vừa thao tác thất bại
  const [visible, setVisible] = useState(readVis);
  const toggleLine = (k) => setVisible((v) => {
    const n = { ...v, [k]: !v[k] };
    try { localStorage.setItem(VIS_KEY, JSON.stringify(n)); } catch { /* bỏ qua */ }
    return n;
  });
  const has = chart.length > 0;
  const last = chart[chart.length - 1] || { temp: 0, hum: 0, light: 0 };

  const load = async () => {
    try {
      const [c, d] = await Promise.all([api("/sensors/chart?limit=11"), api("/devices")]);
      setChart(c);
      if (c.length) try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* bỏ qua */ }
      setLeds(d);
    } catch { /* backend chưa chạy */ }
  };

  // Luôn lấy kết quả gần nhất khi mở trang. Chỉ cập nhật liên tục khi thiết bị Online;
  // Offline thì không chạy interval -> Dashboard đóng băng ở kết quả cuối, Online lại thì tự chạy tiếp.
  useEffect(() => {
    load();
    if (!online) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [online]);

  const flagFail = (name) => {
    setFailed((f) => ({ ...f, [name]: true }));
    setTimeout(() => setFailed((f) => ({ ...f, [name]: false })), 4000);
  };

  // Bật/tắt đèn: chờ backend (tối đa 5 giây). Không phản hồi -> nút giữ nguyên trạng thái cũ,
  // backend ghi "THẤT BẠI" vào Action History.
  const toggleLed = async (name) => {
    if (loading[name]) return;
    setLoading((l) => ({ ...l, [name]: true }));
    try {
      const r = await api(`/devices/${name}/control`, { method: "POST", body: { action: leds[name] ? "OFF" : "ON" } });
      setLeds(r.devices);
      if (r.status !== "THÀNH CÔNG") flagFail(name);
    } catch { flagFail(name); }
    setLoading((l) => ({ ...l, [name]: false }));
  };

  const cards = [
    { label: "NHIỆT ĐỘ", value: has ? `${Math.round(last.temp)} °C` : "-- °C", icon: "🌡️", color: C.temp },
    { label: "ĐỘ ẨM", value: has ? `${Math.round(last.hum)} %` : "-- %", icon: "💧", color: C.hum },
    { label: "ÁNH SÁNG", value: has ? `${last.light} Lux` : "-- Lux", icon: "☀️", color: C.light },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Giám sát trực quan trạng thái thiết bị trong thời gian thực" badge="Trực tiếp" />

      <div className="cards">
        {cards.map((c) => (
          <div className="card stat" key={c.label}>
            <div>
              <div className="muted small">{c.label}</div>
              <div className="stat-value">{c.value}</div>
            </div>
            <div className="stat-icon" style={{ background: c.color + "22" }}>{c.icon}</div>
          </div>
        ))}
      </div>

      <div className="card chart-card">
        <div className="chart-head">
          <h3>Biểu đồ dữ liệu cảm biến</h3>
          <div className="legend">
            {LINES.map((l) => (
              <button key={l.key} type="button" className={"legend-btn" + (visible[l.key] ? "" : " off")}
                onClick={() => toggleLine(l.key)} aria-pressed={visible[l.key]} title="Bấm để ẩn/hiện đường dữ liệu">
                <i style={{ background: l.color }} />{l.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="time" stroke="#8b8fa8" tick={{ fontSize: 12 }} />
            {visible.temp && <YAxis yAxisId="temp" orientation="left" domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} stroke={C.temp} tick={{ fill: C.temp, fontSize: 12 }} width={34} />}
            {visible.hum && <YAxis yAxisId="hum" orientation="left" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} stroke={C.hum} tick={{ fill: C.hum, fontSize: 12 }} width={38} />}
            {visible.light && <YAxis yAxisId="light" orientation="right" domain={[0, 2000]} ticks={[0, 400, 800, 1200, 1600, 2000]} stroke={C.light} tick={{ fill: C.light, fontSize: 12 }} width={46} />}
            <Tooltip
              contentStyle={{ background: "#0b0b14", border: "1px solid #2a2a40", borderRadius: 8 }}
              labelFormatter={(l) => `Thời gian: ${l}`}
              formatter={(v, n) => [n === "Nhiệt độ" ? `${v} °C` : n === "Độ ẩm" ? `${v} %` : `${v} Lux`, n]}
            />
            {visible.temp && <Line yAxisId="temp" type="monotone" dataKey="temp" name="Nhiệt độ" stroke={C.temp} strokeWidth={2} dot={false} />}
            {visible.hum && <Line yAxisId="hum" type="monotone" dataKey="hum" name="Độ ẩm" stroke={C.hum} strokeWidth={2} dot={false} />}
            {visible.light && <Line yAxisId="light" type="monotone" dataKey="light" name="Ánh sáng" stroke={C.light} strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="section-title">Điều khiển thiết bị</h3>
      <div className="led-row">
        {Object.entries(leds).map(([name, on]) => (
          <div className="card led" key={name}>
            <div className="led-left">
              <div className={"led-icon" + (on ? " on" : "") + (loading[name] ? " loading" : "")}>{on ? "💡" : "🌑"}</div>
              <div>
                <b>{name.replace("LED", "LED ")}</b>
                <div className={"small " + (failed[name] ? "red" : on ? "yellow" : "muted")}>
                  {loading[name] ? "Đang chờ thiết bị..." : failed[name] ? "Thất bại – thiết bị không phản hồi" : `Trạng thái: ${on ? "BẬT" : "TẮT"}`}
                </div>
              </div>
            </div>
            <button className={"switch" + (on ? " on" : "") + (loading[name] ? " loading" : "")} disabled={loading[name]} onClick={() => toggleLed(name)} aria-label={`Bật/tắt ${name}`}>
              <span />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
