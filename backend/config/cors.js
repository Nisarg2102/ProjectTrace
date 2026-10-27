const origins = new Set([
  'http://localhost:5173',
  'https://project-trace-9r7zsba9l-nisarg2102s-projects.vercel.app',
  ...(process.env.CLIENT_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean)
]);

// Shared by Express and Socket.IO. Bearer authentication does not need cookies.
module.exports = {
  origin(origin, callback) {
    callback(null, !origin || origins.has(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
