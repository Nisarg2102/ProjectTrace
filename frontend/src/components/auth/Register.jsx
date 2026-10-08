import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
export default function Register() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api('/auth/register', { method: 'POST', body: Object.fromEntries(new FormData(event.currentTarget)) }); setMessage(result.message); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center"><div className="panel w-full max-w-md space-y-5"><h1 className="text-2xl font-bold">Join ProgTrack</h1>{error && <p role="alert" className="error">{error}</p>}{message ? <p role="status">{message}</p> : <form onSubmit={submit} className="space-y-4">
    {[['fullName', 'Full name', 'text'], ['email', 'Email', 'email'], ['department', 'Department', 'text'], ['designation', 'Designation', 'text'], ['password', 'Password', 'password']].map(([name, label, type]) => <label className="block" key={name}>{label}<input className="field" name={name} type={type} required={name !== 'designation'} minLength={name === 'password' ? 8 : undefined} maxLength={name === 'password' ? 72 : 100} /></label>)}
    <button className="btn" disabled={busy}>{busy ? 'Registering…' : 'Request account'}</button></form>}<Link className="text-blue-600" to="/login">Back to sign in</Link></div></main>;
}
