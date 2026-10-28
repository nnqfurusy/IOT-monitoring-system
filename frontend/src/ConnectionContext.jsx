import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "./api.js";

const Ctx = createContext({ online: false });
export const useConnection = () => useContext(Ctx);

// Hỏi backend mỗi giây xem ESP8266 còn kết nối không; mất kết nối thì hiện popup
export function ConnectionProvider({ children }) {
  const [online, setOnline] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const was = useRef(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const check = async () => {
      let now = false;
      try { now = (await api("/status")).online; } catch { now = false; }
      if (was.current && !now) setShowPopup(true);  // vừa chuyển Online -> Offline
      if (now) setShowPopup(false);                 // cắm lại -> tự đóng popup
      was.current = now;
      setOnline(now);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  // Bấm OK: về Dashboard (dữ liệu giữ nguyên ở kết quả gần nhất)
  const ok = () => setShowPopup(false);

  return (
    <Ctx.Provider value={{ online }}>
      {children}
      {showPopup && pathname === "/" && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-icon">⚠️</div>
            <h3>Mất kết nối với hệ thống</h3>
            <p>Thiết bị không còn gửi dữ liệu. Hãy kiểm tra nguồn và dây cắm của thiết bị.</p>
            <button className="btn-primary" onClick={ok}>OK</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
