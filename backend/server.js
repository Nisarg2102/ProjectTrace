require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { closeStaleSessions } = require('./controllers/workLogController');
const app = require('./app');
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-')) {
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in backend/.env');
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/progtrack_mern');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }, maxHttpBufferSize: 16384 });
  require('./socket/chatSocket')(io);
  const sweep = setInterval(() => closeStaleSessions().catch(console.error), 30000);
  server.on('error', async error => {
    clearInterval(sweep);
    console.error(`Unable to start API: ${error.message}. Check PORT in backend/.env.`);
    await mongoose.disconnect();
    process.exit(1);
  });
  server.listen(process.env.PORT || 5000, () => console.log('ProgTrack API and chat ready'));
  const shutdown = () => { clearInterval(sweep); io.close(); server.close(async () => { await mongoose.disconnect(); process.exit(0); }); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
start().catch(error => { console.error(error.message); process.exit(1); });
