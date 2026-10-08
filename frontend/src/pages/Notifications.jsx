import { useApi } from '../hooks/useApi';
import DataState from '../components/DataState';
export default function Notifications() {
  const state = useApi('/tasks/history');
  return <section className="panel"><h1 className="text-2xl font-bold mb-2">Recent activity</h1><p className="text-slate-500 mb-4">Your task submissions from the last 30 days.</p><DataState {...state} />{state.data && (state.data.length ? <ul className="divide-y dark:divide-slate-700">{state.data.map(task => <li className="py-4" key={task._id}><p>{task.taskDescription}</p><p className="text-sm text-slate-500">{task.status.replaceAll('_', ' ')} · {new Date(task.createdAt).toLocaleString()}</p></li>)}</ul> : <p>No recent activity.</p>)}</section>;
}
