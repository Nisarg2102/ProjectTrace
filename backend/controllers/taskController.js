const DailyTask = require('../models/DailyTask');
const User = require('../models/User');
const { day, range } = require('../utils/dates');

async function getTodayTasks(req, res) {
  res.json(await DailyTask.find({ user: req.user._id, taskDate: day() }).sort({ createdAt: -1 }));
}
async function submitDailyGrid(req, res) {
  const { tasks, taskDate } = req.body;
  if (!Array.isArray(tasks) || !tasks.length || tasks.length > 50) {
    return res.status(400).json({ message: 'Submit between 1 and 50 tasks' });
  }
  const date = day(taskDate);
  // Validate the entire batch before writing; never delete previous submissions.
  const docs = tasks.map(dto => new DailyTask({ user: req.user._id, taskDate: date,
    taskDescription: dto?.taskDescription, timeSpent: dto?.timeSpent,
    status: dto?.status, googleDocLink: dto?.googleDocLink,
    taskCategory: dto?.taskCategory, priority: dto?.priority, submitted: true }));
  await Promise.all(docs.map(doc => doc.validate()));
  res.status(201).json(await DailyTask.insertMany(docs));
}
async function getTaskHistory(req, res) {
  res.json(await DailyTask.find({ user: req.user._id, taskDate: range(req.query) })
    .populate('user', 'fullName department').sort({ taskDate: -1, createdAt: -1 }));
}
async function getTeamTasks(req, res) {
  const taskDate = day(req.query.date);
  const query = { taskDate };
  if (!['ADMIN', 'CEO'].includes(req.user.role)) {
    const members = req.user.department ? await User.find({ department: req.user.department }).select('_id') : [req.user];
    query.user = { $in: members.map(user => user._id) };
  }
  res.json(await DailyTask.find(query).populate('user', 'fullName department designation').sort({ createdAt: -1 }));
}
async function deleteTask(req, res) {
  const task = await DailyTask.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (!task.user.equals(req.user._id)) return res.status(403).json({ message: 'Not authorized' });
  if (task.submitted) return res.status(400).json({ message: 'Cannot delete a submitted task' });
  await task.deleteOne();
  res.json({ message: 'Task deleted' });
}
module.exports = { getTodayTasks, submitDailyGrid, getTaskHistory, getTeamTasks, deleteTask };
