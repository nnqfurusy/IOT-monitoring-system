-- 4 bảng của hệ thống (backend cũng tự tạo nếu chưa có). Chạy trong phpMyAdmin nếu muốn tạo tay.
CREATE DATABASE IF NOT EXISTS iot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE iot_db;

-- 1. Thiết bị + trạng thái hiện tại (bảng device)
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,          -- LED01, LED02 (đúng tên ESP dùng)
  name VARCHAR(50) NOT NULL,                 -- LED 01, LED 02 (tên hiển thị)
  state VARCHAR(5) NOT NULL DEFAULT 'OFF',   -- ON / OFF: trạng thái cuối cùng
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO devices (code, name, state) VALUES ('LED01','LED 01','OFF'), ('LED02','LED 02','OFF');

-- 2. Dữ liệu cảm biến (mỗi lần đo 1 dòng)
CREATE TABLE IF NOT EXISTS sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY, device_id VARCHAR(50),
  temperature DECIMAL(5,1), humidity DECIMAL(5,1), light INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Lịch sử bật/tắt đèn
CREATE TABLE IF NOT EXISTS action_history (
  id INT AUTO_INCREMENT PRIMARY KEY, device VARCHAR(20), action VARCHAR(10), status VARCHAR(20),
  user_id INT NULL,            -- id người thao tác (không đặt khóa ngoại)
  user_name VARCHAR(100) NULL, -- tên đăng nhập tại thời điểm thao tác
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Nhật ký kết nối của ESP8266 (ONLINE / OFFLINE)
CREATE TABLE IF NOT EXISTS connection_log (
  id INT AUTO_INCREMENT PRIMARY KEY, event VARCHAR(10),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  avatar VARCHAR(500) NOT NULL DEFAULT '',
  project VARCHAR(150) NOT NULL DEFAULT '',
  teacher VARCHAR(100) NOT NULL DEFAULT '',
  subject VARCHAR(100) NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
