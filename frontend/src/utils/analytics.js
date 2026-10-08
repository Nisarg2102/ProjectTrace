export const today = () => new Date().toISOString().slice(0, 10);
export const statuses = ['COMPLETED', 'IN_PROGRESS', 'PENDING', 'BLOCKED', 'REVIEW'];
export function summary(tasks) {
  const completed = tasks.filter(task => task.status === 'COMPLETED').length;
  return { total: tasks.length, completed, rate: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
    hours: tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0) };
}
// Merge overlapping tabs so working hours are counted only once.
export function workSeconds(logs, now = Date.now(), period = {}) {
  const intervals = logs.map(log => [Math.max(period.start || 0, new Date(log.loginDateTime).getTime()), Math.min(period.end || Infinity, now, new Date(log.logoutDateTime || log.lastSeenAt || log.loginDateTime).getTime())]).sort((a, b) => a[0] - b[0]);
  let total = 0, end = 0;
  for (const [start, stop] of intervals) { total += Math.max(0, stop - Math.max(start, end)); end = Math.max(end, stop); }
  return total / 1000;
}

export function workPeriod(from, to) {
  const end = new Date(to).getTime() + 86400000;
  return { start: from ? new Date(from).getTime() : end - 30 * 86400000, end };
}
