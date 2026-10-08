import { useState } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import DataState from '../components/DataState';
import TaskTable from '../components/TaskTable';
import { today, statuses } from '../utils/analytics';
const newRow = () => ({ id: crypto.randomUUID(), taskDescription: '', timeSpent: 0, status: 'IN_PROGRESS', priority: 'MEDIUM', taskCategory: '', googleDocLink: '' });
export default function Tasks() {
  const [date, setDate] = useState(today());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([newRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const history = useApi(`/tasks/history?to=${to}${from ? `&from=${from}` : ''}`);
  const daily = useApi('/tasks/today');
  function update(id, key, value) { setRows(rows.map(row => row.id === id ? { ...row, [key]: value } : row)); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await api('/tasks/submit-daily', { method: 'POST', body: { taskDate: date, tasks: rows.map(row => ({ ...row, timeSpent: Number(row.timeSpent) })) } });
      setRows([newRow()]); setMessage('Tasks submitted successfully.'); history.reload(); daily.reload();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <div className="space-y-6"><h1 className="text-2xl font-bold">My Workspace</h1><form onSubmit={submit} className="panel space-y-4"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Daily submission</h2><p className="text-sm text-slate-500">Log task hours. Submitted entries are final. Dates use UTC.</p></div><label>Task date<input className="field" type="date" value={date} required onChange={e => setDate(e.target.value)} /></label></div>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="text-green-700" role="status">{message}</p>}
    <fieldset disabled={busy} className="space-y-4">{rows.map((row, index) => <div className="rounded-lg border p-4 space-y-3 dark:border-slate-700" key={row.id}><div className="flex justify-between"><h3 className="font-semibold">Task {index + 1}</h3>{rows.length > 1 && <button type="button" className="text-red-600" onClick={() => setRows(rows.filter(item => item.id !== row.id))}>Remove</button>}</div><label className="block">Description<textarea className="field" required maxLength={2000} value={row.taskDescription} onChange={e => update(row.id, 'taskDescription', e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label>Hours<input className="field" type="number" min="0" max="24" step="0.25" required value={row.timeSpent} onChange={e => update(row.id, 'timeSpent', e.target.value)} /></label><label>Status<select className="field" value={row.status} onChange={e => update(row.id, 'status', e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Priority<select className="field" value={row.priority} onChange={e => update(row.id, 'priority', e.target.value)}>{['LOW', 'MEDIUM', 'HIGH'].map(s => <option key={s}>{s}</option>)}</select></label><label>Category<input className="field" maxLength={100} value={row.taskCategory} onChange={e => update(row.id, 'taskCategory', e.target.value)} /></label></div><label className="block">Document URL (optional)<input className="field" type="url" maxLength={512} value={row.googleDocLink} onChange={e => update(row.id, 'googleDocLink', e.target.value)} /></label></div>)}<div className="flex gap-4"><button type="button" className="text-blue-600" disabled={rows.length >= 50} onClick={() => setRows([...rows, newRow()])}>+ Add task</button><button className="btn">{busy ? 'Submitting…' : 'Submit tasks'}</button></div></fieldset></form>
    <section className="panel"><h2 className="text-lg font-semibold">Today’s tasks</h2><DataState {...daily} />{daily.data && <TaskTable tasks={daily.data} />}</section>
    <section className="panel space-y-4"><h2 className="text-lg font-semibold">Task history</h2><div className="flex flex-wrap gap-4"><label>From<input className="field" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input className="field" type="date" value={to} onChange={e => setTo(e.target.value || today())} /></label><p className="self-end text-sm text-slate-500">Defaults to the last 30 days.</p></div><DataState {...history} />{history.data && <TaskTable tasks={history.data} />}</section></div>;
}
