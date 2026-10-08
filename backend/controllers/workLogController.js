const WorkLog = require('../models/WorkLog');
const { range } = require('../utils/dates');
const sessionKey = req => {
  const id = req.body?.sessionId;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(id)) {
    throw Object.assign(new Error('A valid sessionId is required'), { status: 400 });
  }
  return { user: req.user._id, sessionId: id };
};
const closeUpdate = end => [{ $set: { logoutDateTime: end,
  totalSeconds: { $max: [0, { $floor: { $divide: [{ $subtract: [end, '$loginDateTime'] }, 1000] } }] } } }];
async function closeStaleSessions() {
  await WorkLog.updateMany({ logoutDateTime: null, lastSeenAt: { $lt: new Date(Date.now() - 90000) } }, closeUpdate('$lastSeenAt'), { updatePipeline: true });
}
async function getMyWorkLog(req, res) {
  await closeStaleSessions();
  const period = range(req.query);
  res.json(await WorkLog.find({ user: req.user._id, loginDateTime: { $lt: period.$lt },
    $or: [{ logoutDateTime: { $gt: period.$gte } }, { logoutDateTime: null }]
  }).sort({ loginDateTime: -1 }));
}
async function startSession(req, res) {
  const key = sessionKey(req);
  const now = new Date();
  let log;
  try {
    log = await WorkLog.findOneAndUpdate(key, { $setOnInsert: { ...key, loginDateTime: now, lastSeenAt: now, ipAddress: req.ip } }, { upsert: true, returnDocument: 'after' });
  } catch (error) {
    if (error.code !== 11000) throw error;
    log = await WorkLog.findOne(key);
  }
  if (log.logoutDateTime) return res.status(409).json({ message: 'This work session has ended' });
  res.json(log);
}
async function heartbeat(req, res) {
  const log = await WorkLog.findOneAndUpdate({ ...sessionKey(req), logoutDateTime: null }, { lastSeenAt: new Date() }, { returnDocument: 'after' });
  if (!log) return res.status(409).json({ message: 'Start a new work session' });
  res.json(log);
}
async function endSession(req, res) {
  const key = sessionKey(req);
  const log = await WorkLog.findOneAndUpdate({ ...key, logoutDateTime: null }, closeUpdate(new Date()), { returnDocument: 'after', updatePipeline: true });
  res.json(log || await WorkLog.findOne(key) || { message: 'Session already ended' });
}
module.exports = { getMyWorkLog, startSession, endSession, heartbeat, closeStaleSessions };
