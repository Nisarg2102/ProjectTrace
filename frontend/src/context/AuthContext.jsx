import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL, getToken, setToken } from '../api/client';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState([]);
  const session = useRef(null);
  useEffect(() => {
    const expire = () => { setToken(null); setUser(null); };
    window.addEventListener('auth-expired', expire);
    if (getToken()) api('/auth/me').then(setUser).catch(error => {
      if ([401, 403].includes(error.status)) setToken(null);
      else setAuthError(error.message);
    }).finally(() => setLoading(false));
    else setLoading(false);
    return () => window.removeEventListener('auth-expired', expire);
  }, []);
  useEffect(() => {
    if (!user) return;
    const client = io(API_URL.replace(/\/api$/, ''), { auth: { token: getToken() } });
    setSocket(client);
    client.on('presence', setOnline);
    client.on('disconnect', () => setOnline([]));
    let stopped = false;
    let pending = false;
    const start = async () => {
      const id = crypto.randomUUID();
      session.current = id;
      await api('/worklog/start', { method: 'POST', body: { sessionId: id } });
    };
    const tick = async () => {
      if (pending || stopped) return;
      pending = true;
      try {
        if (!session.current) await start();
        else await api('/worklog/heartbeat', { method: 'POST', body: { sessionId: session.current } });
        if (!stopped) setSessionError('');
      } catch (error) {
        if (error.status === 409) session.current = null;
        if (!stopped) setSessionError(`Work tracking: ${error.message}. Retrying automatically.`);
      } finally { pending = false; }
    };
    tick();
    const timer = setInterval(tick, 30000);
    const close = () => {
      if (session.current) api('/worklog/end', { method: 'POST', body: { sessionId: session.current }, keepalive: true }).catch(() => {});
      session.current = null;
    };
    const resume = event => { if (event.persisted) tick(); };
    window.addEventListener('pagehide', close);
    window.addEventListener('pageshow', resume);
    return () => {
      stopped = true;
      clearInterval(timer);
      close();
      client.disconnect();
      setSocket(null);
      setOnline([]);
      window.removeEventListener('pagehide', close);
      window.removeEventListener('pageshow', resume);
    };
  }, [user]);
  async function login(credentials) {
    const { token, ...profile } = await api('/auth/login', { method: 'POST', body: credentials });
    setToken(token, credentials.rememberMe);
    setAuthError('');
    setUser(profile);
  }
  async function logout() {
    if (session.current) await api('/worklog/end', { method: 'POST', body: { sessionId: session.current } });
    session.current = null;
    setToken(null);
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, loading, authError, sessionError, login, logout, socket, online }}>{children}</AuthContext.Provider>;
}
