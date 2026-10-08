function day(value = new Date()) {
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error('Use dates in YYYY-MM-DD format'), { status: 400 });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || (typeof value === 'string' && date.toISOString().slice(0, 10) !== value)) {
    throw Object.assign(new Error('Invalid date'), { status: 400 });
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
function range({ from, to } = {}) {
  const end = day(to);
  const start = from ? day(from) : new Date(end.getTime() - 29 * 86400000);
  if (start > end) throw Object.assign(new Error('Start date must precede end date'), { status: 400 });
  return { $gte: start, $lt: new Date(end.getTime() + 86400000) };
}
module.exports = { day, range };
