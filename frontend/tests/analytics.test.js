import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summary, workSeconds } from '../src/utils/analytics.js';
test('empty analytics and completion percentage', () => {
  assert.deepEqual(summary([]), { total: 0, completed: 0, rate: 0, hours: 0 });
  assert.deepEqual(summary([{ status: 'COMPLETED', timeSpent: 2 }, { status: 'REVIEW', timeSpent: 1 }]), { total: 2, completed: 1, rate: 50, hours: 3 });
});
test('overlapping work sessions count once, active sessions stop at last heartbeat', () => {
  const log = (start, end) => ({ loginDateTime: new Date(start * 1000).toISOString(), logoutDateTime: new Date(end * 1000).toISOString() });
  assert.equal(workSeconds([log(10, 40), log(20, 50), log(60, 90)], 100000), 70);
  assert.equal(workSeconds([{ loginDateTime: new Date(10000).toISOString(), lastSeenAt: new Date(40000).toISOString() }], 100000), 30);
});

test('sessions spanning a date boundary are clipped to the selected period', () => {
  assert.equal(workSeconds([{ loginDateTime: new Date(0).toISOString(), logoutDateTime: new Date(100000).toISOString() }], 100000, { start: 20000, end: 80000 }), 60);
});
