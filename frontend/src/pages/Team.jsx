import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { today } from '../utils/analytics';
import TaskTable from '../components/TaskTable';
import DataState from '../components/DataState';
export default function Team() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const data = useApi(`/tasks/team?date=${date}`);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Team workspace</h1><p className="text-slate-500">{['ADMIN', 'CEO'].includes(user.role) ? 'All departments' : user.department || 'Your tasks'} · Daily submissions (UTC)</p><section className="panel space-y-4"><label className="block max-w-xs">Date<input className="field" type="date" value={date} onChange={e => setDate(e.target.value || today())} /></label><DataState {...data} />{data.data && <TaskTable tasks={data.data} team />}</section></div>;
}
