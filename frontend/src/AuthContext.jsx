import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken()); // có token -> chờ xác minh

  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me").then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);

  const authenticate = async (path, body) => {
    const d = await api(path, { method: "POST", body });
    setToken(d.token);
    setUser(d.user);
  };
  const login = (body) => authenticate("/auth/login", body);
  const register = (body) => authenticate("/auth/register", body);
  const logout = () => { setToken(null); setUser(null); };
  const updateProfile = async (body) => setUser((await api("/auth/me", { method: "PUT", body })).user);
  const changePassword = (body) => api("/auth/password", { method: "PUT", body });

  return <Ctx.Provider value={{ user, loading, login, register, logout, updateProfile, changePassword }}>{children}</Ctx.Provider>;
}