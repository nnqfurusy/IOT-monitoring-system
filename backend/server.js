require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const mqtt = require("mqtt");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const E = process.env;
const JWT_SECRET = E.JWT_SECRET || "10101010qQ*";

const DEVICE_ID = "ESP8266-01";
const TOPIC = { sensor: "data_sensors", control: "device_control", response: "device_response" };
const STATUS_VI = { SUCCESS: "THÀNH CÔNG", FAILED: "THẤT BẠI" };
const OFFLINE_MS = 5000; // quá 5 giây không nhận dữ liệu cảm biến -> mất kết nối
const pending = {};      // lệnh bật/tắt đang chờ phản hồi từ ESP, theo từng đèn
let pool, mqttClient;
let lastSeen = 0;
const isOnline = () => Date.now() - lastSeen < OFFLINE_MS;

// ================= DATABASE (4 bảng) =================
async function initDb() {
  const boot = await mysql.createConnection({ host: E.DB_HOST, port: E.DB_PORT, user: E.DB_USER, password: E.DB_PASS });
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${E.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await boot.end();
  pool = mysql.createPool({ host: E.DB_HOST, port: E.DB_PORT, user: E.DB_USER, password: E.DB_PASS, database: E.DB_NAME, dateStrings: true, charset: "utf8mb4" });
  await pool.query(`CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(50) NOT NULL,
    state VARCHAR(5) NOT NULL DEFAULT 'OFF', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
  await pool.query("INSERT IGNORE INTO devices (code, name, state) VALUES ('LED01','LED 01','OFF'), ('LED02','LED 02','OFF')");
  await pool.query(`CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY, device_id VARCHAR(50),
    temperature DECIMAL(5,1), humidity DECIMAL(5,1), light INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS action_history (
    id INT AUTO_INCREMENT PRIMARY KEY, device VARCHAR(20), action VARCHAR(10), status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS connection_log (
    id INT AUTO_INCREMENT PRIMARY KEY, event VARCHAR(10), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar VARCHAR(500) NOT NULL DEFAULT '',
    project VARCHAR(150) NOT NULL DEFAULT '',
    teacher VARCHAR(100) NOT NULL DEFAULT '',
    subject VARCHAR(100) NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  // Ghi lại ai thực hiện thao tác (chỉ lưu trong CSDL, không hiển thị ở frontend)
  for (const col of ["user_id INT NULL", "user_name VARCHAR(100) NULL"]) {
    try { await pool.query(`ALTER TABLE action_history ADD COLUMN ${col}`); }
    catch (e) { if (e.errno !== 1060) throw e; } // 1060 = cột đã tồn tại
  }
}

// Trạng thái đèn lấy từ bảng devices: { LED01: true, LED02: false }
async function getLeds() {
  const [rows] = await pool.query("SELECT code, state FROM devices");
  return Object.fromEntries(rows.map((r) => [r.code, r.state === "ON"]));
}
const saveAction = (device, action, status, user) =>
  pool.query("INSERT INTO action_history (device, action, status, user_id, user_name) VALUES (?,?,?,?,?)",
    [device.replace("LED", "LED "), action === "ON" ? "BẬT" : "TẮT", STATUS_VI[status] || status, user?.id ?? null, user?.username ?? null]);

// ESP vừa cắm lại -> khởi động lại với 2 đèn tắt -> gửi lại trạng thái cuối cùng đã lưu (đèn nào ON thì bật lại)
async function restoreLeds() {
  const [rows] = await pool.query("SELECT code FROM devices WHERE state = 'ON'");
  for (const r of rows) {
    mqttClient.publish(TOPIC.control, JSON.stringify({ device_id: DEVICE_ID, device: r.code, action: "ON" }));
    console.log("Khôi phục trạng thái:", r.code, "ON");
  }
}

// ================= MQTT (kết nối vào Mosquitto đang chạy ở cổng 1900) =================
function startMqtt() {
  mqttClient = mqtt.connect(`mqtt://${E.MQTT_HOST}:${E.MQTT_PORT}`, { username: E.MQTT_USER, password: E.MQTT_PASS, clientId: "smartiot-backend" });
  mqttClient.on("connect", () => { console.log("Đã kết nối Mosquitto"); mqttClient.subscribe([TOPIC.sensor, TOPIC.response]); });
  mqttClient.on("error", (e) => console.error("MQTT lỗi:", e.message));
  mqttClient.on("message", async (topic, buf) => {
    try {
      const d = JSON.parse(buf.toString());
      if (topic === TOPIC.sensor) {
        const reconnected = !isOnline();   // trước đó offline -> ESP vừa cắm lại / khởi động lại
        lastSeen = Date.now();
        await pool.query("INSERT INTO sensor_data (device_id, temperature, humidity, light) VALUES (?,?,?,?)",
          [d.device_id, d.temperature, d.humidity, d.light]);
        console.log("Sensor:", d);
        if (reconnected) setTimeout(() => restoreLeds().catch(console.error), 500);
      } else if (topic === TOPIC.response) {
        // Cập nhật trạng thái thiết bị trong bảng devices theo trạng thái thật mà ESP báo về
        if (["ON", "OFF"].includes(d.state)) await pool.query("UPDATE devices SET state = ? WHERE code = ?", [d.state, d.device]);
        const p = pending[d.device];
        if (p) { clearTimeout(p.timer); delete pending[d.device]; p.resolve(d.status); }
      }
    } catch (e) { console.error("Lỗi xử lý MQTT:", e.message); }
  });
}

// Ghi nhật ký ONLINE / OFFLINE mỗi khi trạng thái kết nối đổi
let wasOnline = false;
setInterval(() => {
  const now = isOnline();
  if (now !== wasOnline) {
    wasOnline = now;
    pool.query("INSERT INTO connection_log (event) VALUES (?)", [now ? "ONLINE" : "OFFLINE"]).catch(() => {});
  }
}, 1000);

// ================= API =================
const app = express();
app.use(cors());
app.use(express.json());
// ================= XÁC THỰC NGƯỜI DÙNG =================
const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, fullName: u.full_name, avatar: u.avatar, project: u.project, teacher: u.teacher, subject: u.subject });
const signToken = (u) => jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: "7d" });
const str = (v) => String(v ?? "").trim();
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const AVATAR_RE = /^(https?:\/\/|\/)\S*$/;

async function auth(req, res, next) {
  let user;
  try {
    const { id } = jwt.verify((req.headers.authorization || "").replace(/^Bearer /, ""), JWT_SECRET);
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    user = rows[0];
  } catch { /* token sai hoặc hết hạn */ }
  if (!user) return res.status(401).json({ error: "Chưa đăng nhập hoặc phiên đã hết hạn" });
  req.user = user;
  next();
}

app.post("/api/auth/register", async (req, res) => {
  const username = str(req.body.username).toLowerCase(), email = str(req.body.email).toLowerCase();
  const fullName = str(req.body.fullName), password = String(req.body.password ?? "");
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: "Tên đăng nhập 3–30 ký tự: chữ thường, số hoặc dấu _" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
  if (!fullName) return res.status(400).json({ error: "Vui lòng nhập họ tên" });
  if (password.length < 6) return res.status(400).json({ error: "Mật khẩu tối thiểu 6 ký tự" });
  const [dup] = await pool.query("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
  if (dup.length) return res.status(409).json({ error: "Tên đăng nhập hoặc email đã tồn tại" });
  const [r] = await pool.query("INSERT INTO users (username, email, password_hash, full_name) VALUES (?,?,?,?)",
    [username, email, await bcrypt.hash(password, 10), fullName]);
  const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [r.insertId]);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const id = str(req.body.username).toLowerCase(), password = String(req.body.password ?? "");
  const [rows] = await pool.query("SELECT * FROM users WHERE username = ? OR email = ?", [id, id]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

// Sửa thông tin hồ sơ
app.put("/api/auth/me", auth, async (req, res) => {
  const fullName = str(req.body.fullName), email = str(req.body.email).toLowerCase(), avatar = str(req.body.avatar);
  const project = str(req.body.project), teacher = str(req.body.teacher), subject = str(req.body.subject);
  if (!fullName) return res.status(400).json({ error: "Họ tên không được để trống" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
  if (avatar && !AVATAR_RE.test(avatar)) return res.status(400).json({ error: "Ảnh đại diện phải là link http(s) hoặc đường dẫn bắt đầu bằng /" });
  const [dup] = await pool.query("SELECT id FROM users WHERE email = ? AND id <> ?", [email, req.user.id]);
  if (dup.length) return res.status(409).json({ error: "Email đã được tài khoản khác sử dụng" });
  await pool.query("UPDATE users SET full_name=?, email=?, avatar=?, project=?, teacher=?, subject=? WHERE id=?",
    [fullName, email, avatar, project, teacher, subject, req.user.id]);
  const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  res.json({ user: publicUser(user) });
});

// Đổi mật khẩu
app.put("/api/auth/password", auth, async (req, res) => {
  const oldPassword = String(req.body.oldPassword ?? ""), newPassword = String(req.body.newPassword ?? "");
  if (!(await bcrypt.compare(oldPassword, req.user.password_hash))) return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Mật khẩu mới tối thiểu 6 ký tự" });
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), req.user.id]);
  res.json({ ok: true });
});
const paging = (q) => { const size = Math.min(+q.pageSize || 10, 100), page = Math.max(+q.page || 1, 1); return [size, (page - 1) * size]; };

app.get("/api/sensors/chart", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT DATE_FORMAT(created_at,'%H:%i:%s') AS time, temperature, humidity, light FROM sensor_data ORDER BY id DESC LIMIT ?",
    [Math.min(+req.query.limit || 11, 100)]);
  res.json(rows.reverse().map((r) => ({ time: r.time, temp: +r.temperature, hum: +r.humidity, light: r.light })));
});

const FLAT = `
 SELECT id*3-2 AS fid, id AS rid, 1 AS ord, 'Nhiệt độ' AS type, CONCAT(temperature,' °C') AS value, DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS time FROM sensor_data
 UNION ALL SELECT id*3-1, id, 2, 'Độ ẩm', CONCAT(humidity,' %'), DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') FROM sensor_data
 UNION ALL SELECT id*3, id, 3, 'Ánh sáng', CONCAT(light,' Lux'), DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') FROM sensor_data`;
app.get("/api/sensors/history", auth, async (req, res) => {
  const q = (req.query.q || "").trim(), by = req.query.by || "Tất cả";
  const [size, offset] = paging(req.query);
  let where = "WHERE 1=1"; const args = [];
  if (["Nhiệt độ", "Độ ẩm", "Ánh sáng"].includes(by)) {
    where += " AND type = ?"; args.push(by);
    if (q) { where += " AND value LIKE ?"; args.push(`%${q}%`); }
  } else if (by === "Thời gian") {
    if (q) { where += " AND time LIKE ?"; args.push(`%${q}%`); }
  } else if (q) {
    where += " AND CONCAT_WS(' ', CONCAT('#',LPAD(fid,3,'0')), type, value, time) LIKE ?"; args.push(`%${q}%`);
  }
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${FLAT}) t ${where}`, args);
  const [rows] = await pool.query(
    `SELECT CONCAT('#',LPAD(fid,3,'0')) AS id, type, value, time FROM (${FLAT}) t ${where} ORDER BY rid DESC, ord ASC LIMIT ? OFFSET ?`,
    [...args, size, offset]);
  res.json({ rows, total });
});

app.get("/api/actions", auth, async (req, res) => {
  const q = (req.query.q || "").trim();
  const device = req.query.device || "", action = req.query.action || "", status = req.query.status || "";
  const [size, offset] = paging(req.query);
  const T = "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s')";
  const where = `WHERE (? = '' OR CONCAT_WS(' ', CONCAT('#',LPAD(id,3,'0')), device, action, status, ${T}) LIKE ?)
    AND (? = '' OR device = ?) AND (? = '' OR action = ?) AND (? = '' OR status = ?)`;
  const args = [q, `%${q}%`, device, device, action, action, status, status];
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM action_history ${where}`, args);
  const [rows] = await pool.query(
    `SELECT CONCAT('#',LPAD(id,3,'0')) AS id, device, action, status, ${T} AS time FROM action_history ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...args, size, offset]);
  res.json({ rows, total });
});

app.get("/api/devices", auth, async (req, res) => res.json(await getLeds()));
app.get("/api/status", (req, res) => res.json({ online: isOnline() }));

// Điều khiển đèn: gửi MQTT -> chờ ESP phản hồi tối đa 5 giây -> lưu lịch sử
// Không phản hồi = THẤT BẠI, trạng thái trong bảng devices giữ nguyên
app.post("/api/devices/:device/control", auth, async (req, res) => {
  const device = req.params.device, action = String(req.body.action || "").toUpperCase();
  const leds = await getLeds();
  if (!(device in leds) || !["ON", "OFF"].includes(action)) return res.status(400).json({ error: "device hoặc action không hợp lệ" });
  if (pending[device]) return res.status(409).json({ error: "Đang xử lý lệnh trước đó" });
  const status = await new Promise((resolve) => {
    const timer = setTimeout(() => { delete pending[device]; resolve("FAILED"); }, 5000);
    pending[device] = { resolve, timer };
    mqttClient.publish(TOPIC.control, JSON.stringify({ device_id: DEVICE_ID, device, action }));
  });
    await saveAction(device, action, status, req.user);
  res.json({ status: STATUS_VI[status] || status, devices: await getLeds() });
});

initDb().then(() => {
  startMqtt();
  app.listen(E.API_PORT, "0.0.0.0", () => console.log(`API: http://localhost:${E.API_PORT}/api`));
}).catch((e) => { console.error("Lỗi khởi động (XAMPP MySQL đã bật chưa?):", e.message); process.exit(1); });
