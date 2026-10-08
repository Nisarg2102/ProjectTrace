const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
process.env.JWT_SECRET = 'test-only-secret-longer-than-thirty-two-characters';
const app = require('../app');
const User = require('../models/User');
const WorkLog = require('../models/WorkLog');
const Message = require('../models/Message');
const { closeStaleSessions } = require('../controllers/workLogController');
let mongo, server, io, base, alice, bob, outsider, token;
const sockets = [];
async function request(path, { body, auth = token, method = body ? 'POST' : 'GET' } = {}) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
const sign = user => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
const socket = auth => { const client = connect(base, { auth: { token: auth }, autoConnect: false, reconnection: false }); sockets.push(client); return client; };
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  [alice, bob, outsider] = await User.create([
    { email: 'alice@example.com', fullName: 'Alice', password: 'password123', role: 'INTERN', department: 'Engineering', isApproved: true },
    { email: 'bob@example.com', fullName: 'Bob', password: 'password123', role: 'INTERN', department: 'Engineering', isApproved: true },
    { email: 'other@example.com', fullName: 'Other', password: 'password123', role: 'ADMIN', department: 'Design', isApproved: true }
  ]);
  token = sign(alice);
  server = http.createServer(app);
  io = new Server(server);
  require('../socket/chatSocket')(io);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  sockets.forEach(client => client.disconnect());
  if (io) await new Promise(resolve => io.close(resolve));
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('protected routes reject missing, invalid, expired, deleted and unapproved accounts', async () => {
  for (const auth of ['', 'bad-token', jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ id: new mongoose.Types.ObjectId() }, process.env.JWT_SECRET)]) {
    assert.equal((await request('/tasks/today', { auth })).status, 401);
  }
  const pending = await User.create({ email: 'pending@example.com', fullName: 'Pending', password: 'password123', role: 'INTERN' });
  assert.equal((await request('/worklog', { auth: sign(pending) })).status, 403);
  await User.updateOne({ _id: bob.id }, { isActive: false });
  assert.equal((await request('/tasks/today', { auth: sign(bob) })).status, 403);
  await User.updateOne({ _id: bob.id }, { isActive: true });
});
test('registration cannot grant admin privileges or bypass approval', async () => {
  const result = await request('/auth/register', { body: { email: 'new@example.com', fullName: 'New', password: 'password123', role: 'ADMIN', isApproved: true } });
  assert.equal(result.status, 201);
  assert.equal(result.data.token, undefined);
  const user = await User.findOne({ email: 'new@example.com' });
  assert.equal(user.role, 'INTERN');
  assert.equal(user.isApproved, false);
  assert.equal((await request('/auth/login', { body: { email: user.email, password: 'password123' } })).status, 403);
});
test('repeat login and non-password saves preserve the password hash', async () => {
  const previous = alice.password;
  for (let index = 0; index < 2; index++) {
    const result = await request('/auth/login', { body: { email: ' ALICE@EXAMPLE.COM ', password: 'password123' } });
    assert.equal(result.status, 200);
    assert.ok(result.data.token);
    assert.equal(result.data.password, undefined);
  }
  assert.equal((await User.findById(alice.id)).password, previous);
  assert.equal((await request('/auth/me')).data.fullName, 'Alice');
  assert.equal((await request('/auth/login', { body: { email: alice.email, password: 'wrong' } })).status, 401);
});
test('task submissions validate whole batch and enforce ownership and team boundaries', async () => {
  const taskDate = new Date().toISOString().slice(0, 10);
  assert.equal((await request('/tasks/submit-daily', { body: { taskDate, tasks: [{ taskDescription: 'Implemented API', timeSpent: 2, status: 'COMPLETED' }] } })).status, 201);
  assert.equal((await request('/tasks/submit-daily', { auth: sign(outsider), body: { taskDate, tasks: [{ taskDescription: 'Design work' }] } })).status, 201);
  const before = (await request('/tasks/history')).data.length;
  assert.equal((await request('/tasks/submit-daily', { body: { tasks: [{ taskDescription: 'Valid' }, { taskDescription: 'Bad hours', timeSpent: -1 }] } })).status, 400);
  assert.equal((await request('/tasks/history')).data.length, before);
  assert.equal((await request('/tasks/history?from=invalid')).status, 400);
  assert.equal((await request('/tasks/history?from=2026-02-30')).status, 400);
  assert.equal((await request('/tasks/history?from=2030-01-01&to=2020-01-01')).status, 400);
  assert.equal((await request('/tasks/team', { auth: sign(bob) })).data.length, 1);
  assert.equal((await request('/tasks/team', { auth: sign(outsider) })).data.length, 2);
  const task = (await request('/tasks/today')).data[0];
  assert.equal((await request(`/tasks/${task._id}`, { auth: sign(bob), method: 'DELETE' })).status, 403);
  assert.equal((await request(`/tasks/${task._id}`, { method: 'DELETE' })).status, 400);
});
test('session start is idempotent, tab closure is scoped, and end is idempotent', async () => {
  const sessionId = 'test-session-00000001';
  const starts = await Promise.all(Array.from({ length: 3 }, () => request('/worklog/start', { body: { sessionId } })));
  assert.ok(starts.every(result => result.status === 200));
  assert.equal(await WorkLog.countDocuments({ user: alice.id, sessionId }), 1);
  const another = 'test-session-00000002';
  await request('/worklog/start', { body: { sessionId: another } });
  assert.equal((await request('/worklog/end', { auth: sign(bob), body: { sessionId } })).status, 200);
  assert.equal((await WorkLog.findOne({ sessionId })).logoutDateTime, undefined);
  const first = await request('/worklog/end', { body: { sessionId } });
  const second = await request('/worklog/end', { body: { sessionId } });
  assert.equal(first.data.logoutDateTime, second.data.logoutDateTime);
  assert.equal((await WorkLog.findOne({ sessionId: another })).logoutDateTime, undefined);
  assert.equal((await request('/worklog/heartbeat', { body: { sessionId } })).status, 409);
  assert.equal((await request('/worklog/start', { body: { sessionId } })).status, 409);
});
test('abandoned sessions end at their last confirmed heartbeat', async () => {
  const login = new Date(Date.now() - 180000), lastSeenAt = new Date(Date.now() - 100000);
  const log = await WorkLog.create({ user: alice.id, sessionId: 'stale-session-000001', loginDateTime: login, lastSeenAt });
  await closeStaleSessions();
  const closed = await WorkLog.findById(log.id);
  assert.equal(closed.logoutDateTime.getTime(), lastSeenAt.getTime());
  assert.equal(closed.totalSeconds, 80);
});
test('socket authentication, broadcast, persistence, and trusted sender identity', async () => {
  const invalid = socket('invalid');
  const failed = once(invalid, 'connect_error'); invalid.connect(); await failed;
  const sender = socket(token), receiver = socket(sign(bob));
  const ready = Promise.all([once(sender, 'connect'), once(receiver, 'connect')]); sender.connect(); receiver.connect(); await ready;
  const received = once(receiver, 'message');
  const ack = await new Promise(resolve => sender.emit('sendMessage', { content: 'Hello team', sender: outsider.id }, resolve));
  assert.equal(ack.message.sender._id, alice.id);
  const [message] = await received;
  assert.equal(message.content, 'Hello team');
  assert.equal(await Message.countDocuments({ content: 'Hello team' }), 1);
  assert.equal((await request('/chat/messages')).data[0].sender.fullName, 'Alice');
  const empty = await new Promise(resolve => sender.emit('sendMessage', { content: ' ' }, resolve));
  assert.ok(empty.error);
  sender.disconnect(); receiver.disconnect();
});
test('presence remains online until the final tab disconnects', async () => {
  const first = socket(token), second = socket(token), observer = socket(sign(bob));
  for (const client of [observer, first, second]) { const connected = once(client, 'connect'); client.connect(); await connected; }
  let changed = once(observer, 'presence'); first.disconnect();
  let [people] = await changed;
  assert.ok(people.some(person => person._id === alice.id));
  changed = once(observer, 'presence'); second.disconnect();
  [people] = await changed;
  assert.ok(!people.some(person => person._id === alice.id));
  observer.disconnect();
});
