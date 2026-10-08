export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
let accessToken = sessionStorage.getItem('progtrack-token') || localStorage.getItem('progtrack-token') || '';
export const getToken = () => accessToken;
export function setToken(token, remember = false) {
  accessToken = token || '';
  localStorage.removeItem('progtrack-token');
  sessionStorage.removeItem('progtrack-token');
  if (token) (remember ? localStorage : sessionStorage).setItem('progtrack-token', token);
}
export async function api(path, { method = 'GET', body, signal, keepalive } = {}) {
  const response = await fetch(`${API_URL}${path}`, { method, signal, keepalive,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('auth-expired'));
    throw Object.assign(new Error(data.message || 'Request failed'), { status: response.status });
  }
  return data;
}
