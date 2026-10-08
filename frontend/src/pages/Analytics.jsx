import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { today, statuses, summary, workSeconds } from '../utils/analytics';
import DataState from '../components/DataState';
import TaskTable from '../components/TaskTable';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);
const colors = ['#22c55e', '#4154f1', '#f59e0b', '#ef4444', '#06b6d4'];
export default function Analytics({ dashboard = false }) {
  const { user } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today());
  const query = `?to=${to}${from ? `&from=${from}` : ''}`;
  const tasks = useApi(`/tasks/history${query}`);
  const logs = useApi(`/worklog${query}`);
  const stats = summary(tasks.data || []);
  const categories = {};
  const dates = {};
  for (const task of tasks.data || []) {
    const category = task.taskCategory || 'Uncategorized';
    categories[category] = (categories[category] || 0) + 1;
    const date = task.taskDate.slice(0, 10);
    dates[date] = (dates[date] || 0) + (task.status === 'COMPLETED' ? 1 : 0);
  }
  const labels = Object.keys(dates).sort();
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">{dashboard ? 'Dashboard Overview' : 'My Analytics'}</h1><p className="text-slate-500">Welcome back, {user.fullName}. Your activity for the selected period.</p></div><div className="flex flex-wrap gap-4"><label>From<input className="field" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input className="field" type="date" value={to} onChange={e => setTo(e.target.value || today())} /></label><p className="self-end text-sm text-slate-500">Last 30 days by default · UTC</p></div><DataState {...tasks} /><DataState {...logs} />
    {tasks.data && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Total tasks', stats.total], ['Completed', stats.completed], ['Completion rate', `${stats.rate}%`], ['Work hours', logs.data ? `${(workSeconds(logs.data) / 3600).toFixed(1)}h` : '—']].map(([label, value]) => <div key={label} className="panel border-t-4 border-t-blue-600"><div className="text-3xl font-bold">{value}</div><div className="mt-2 text-sm text-slate-500">{label}</div></div>)}</div>
    {tasks.data.length > 0 ? <div className="grid gap-6 lg:grid-cols-3"><section className="panel"><h2 className="font-semibold mb-4">Completed tasks by date</h2><div className="h-64"><Line data={{ labels, datasets: [{ label: 'Completed', data: labels.map(date => dates[date]), borderColor: '#4154f1', tension: 0.3 }] }} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div></section><section className="panel"><h2 className="font-semibold mb-4">Tasks by category</h2><div className="h-64"><Bar data={{ labels: Object.keys(categories), datasets: [{ label: 'Tasks', data: Object.values(categories), backgroundColor: colors }] }} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div></section><section className="panel"><h2 className="font-semibold mb-4">Status distribution</h2><div className="h-64"><Doughnut data={{ labels: statuses.map(s => s.replaceAll('_', ' ')), datasets: [{ data: statuses.map(s => tasks.data.filter(t => t.status === s).length), backgroundColor: colors }] }} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div></section></div> : <p className="panel">Submit your first task in My Workspace to see your analytics.</p>}
    <section className="panel"><h2 className="text-lg font-semibold mb-4">Recent submissions · {stats.hours.toFixed(1)} task hours</h2><TaskTable tasks={tasks.data.slice(0, 10)} /></section></>}
    {!dashboard && logs.data && <section className="panel"><h2 className="text-lg font-semibold">Work sessions</h2><p className="text-sm text-slate-500 mb-4">Overlapping tabs count once in total work hours. Active sessions count through their last heartbeat.</p>{logs.data.length ? <ul className="divide-y dark:divide-slate-700">{logs.data.map(log => <li className="py-3" key={log._id}>{new Date(log.loginDateTime).toLocaleString()} → {log.logoutDateTime ? new Date(log.logoutDateTime).toLocaleString() : 'Active'} · {(workSeconds([log]) / 3600).toFixed(2)} h</li>)}</ul> : <p>No work sessions in this period.</p>}</section>}
  </div>;
}
