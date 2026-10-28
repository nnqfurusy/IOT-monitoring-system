const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const TOKEN_KEY = "smartiot_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  // Token hết hạn / sai -> đăng xuất
  if (res.status === 401 && getToken()) { setToken(null); window.dispatchEvent(new Event("auth-expired")); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}