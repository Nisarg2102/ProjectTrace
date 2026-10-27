const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/cors');
const { protect } = require('./middleware/auth');
const Message = require('./models/Message');
const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/worklog', require('./routes/workLogRoutes'));
app.get('/api/chat/messages', protect, async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 }).limit(100).populate('sender', 'fullName');
  res.json(messages.reverse());
});
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error.name) ? 400 : error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.code === 11000 ? 'This record already exists' : status >= 500 ? 'Server error. Please try again.' : error.message });
});
module.exports = app;
