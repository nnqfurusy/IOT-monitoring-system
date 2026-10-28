// Tạo dữ liệu mẫu để demo tìm kiếm: node seed.js
require("dotenv").config();
const mysql = require("mysql2/promise");
const E = process.env;
const f = (d) => d.toISOString().slice(0, 19).replace("T", " ");
(async () => {
  const db = await mysql.createConnection({ host: E.DB_HOST, user: E.DB_USER, password: E.DB_PASS, database: E.DB_NAME });
  const now = Date.now();
  for (let i = 0; i < 40; i++) {
    await db.query("INSERT INTO sensor_data (device_id,temperature,humidity,light,created_at) VALUES (?,?,?,?,?)",
      ["ESP8266-01", (27 + Math.sin(i / 3) * 2).toFixed(1), (62 + Math.cos(i / 4) * 4).toFixed(1), Math.round(450 + Math.sin(i / 2) * 200), f(new Date(now - (40 - i) * 3000))]);
  }
  const st = ["THÀNH CÔNG", "THÀNH CÔNG", "THẤT BẠI", "TIMEOUT"];
  for (let i = 0; i < 30; i++) {
    await db.query("INSERT INTO action_history (device,action,status,created_at) VALUES (?,?,?,?)",
      [i % 3 === 1 ? "LED 02" : "LED 01", i % 2 ? "TẮT" : "BẬT", st[i % 4], f(new Date(now - (30 - i) * 217000))]);
  }
  console.log("Đã thêm dữ liệu mẫu"); await db.end();
})();
