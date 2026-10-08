import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Analytics from './pages/Analytics';
function Protected() {
  const { user, loading, authError } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status" className="p-8">Restoring your session…</p>;
  if (authError) return <div className="error">Unable to restore your session: {authError} <button onClick={() => window.location.reload()}>Retry</button></div>;
  return user ? <Layout /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route path="/" element={<Protected />}>
      <Route index element={<Dashboard />} /><Route path="tasks" element={<Tasks />} />
      <Route path="team" element={<Team />} /><Route path="analytics" element={<Analytics />} />
      <Route path="chat" element={<Chat />} /><Route path="notifications" element={<Notifications />} />
    </Route><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
