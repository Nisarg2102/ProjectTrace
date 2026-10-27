const mongoose = require('mongoose');

let pending;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (pending) return pending;
  if (!process.env.MONGO_URI) {
    throw Object.assign(new Error('Database is not configured. Set MONGO_URI on the backend.'), { status: 503 });
  }
  // Reuse the connection across warm requests and share concurrent cold starts.
  pending = mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  }).then(() => mongoose.connection).catch(error => {
    console.error('MongoDB connection failed:', error.name);
    throw Object.assign(new Error('Database connection unavailable. Check backend database configuration and network access.'), { status: 503 });
  }).finally(() => { pending = undefined; });
  return pending;
}

module.exports = { connectDatabase };
