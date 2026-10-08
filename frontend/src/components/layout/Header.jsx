import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
export default function Header({ toggleSidebar, toggleTheme, theme }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true); setError('');
    try { await logout(); } catch (error) { setError(`Logout failed: ${error.message}. Please retry.`); }
    finally { setBusy(false); }
  }
  return <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center gap-3"><button aria-label="Toggle navigation" onClick={toggleSidebar} className="lg:hidden">☰</button><Link to="/" className="text-2xl font-bold text-blue-600">Prog<span className="text-slate-800 dark:text-white">Track</span></Link></div>
    <div className="flex items-center gap-3"><Link to="/chat">Chat</Link><Link className="hidden sm:block" to="/notifications">Activity</Link><button aria-label="Toggle color theme" onClick={toggleTheme}>{theme === 'dark' ? '☀' : '☾'}</button><span className="hidden md:block">{user.fullName}</span><button onClick={leave} disabled={busy} className="text-sm text-blue-600">{busy ? 'Ending session…' : 'Logout'}</button></div>
    {error && <p role="alert" className="error absolute right-4 top-16">{error}</p>}
  </header>;
}
