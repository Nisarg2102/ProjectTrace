const { authenticate } = require('../middleware/auth');
const Message = require('../models/Message');
module.exports = io => {
  const online = new Map();
  const publishPresence = () => io.emit('presence', [...online.values()].map(({ user }) => user));
  io.use(async (socket, next) => {
    try { socket.user = await authenticate(socket.handshake.auth?.token); next(); }
    catch { next(new Error('Authentication failed')); }
  });
  io.on('connection', socket => {
    const id = socket.user.id;
    const entry = online.get(id) || { user: { _id: id, fullName: socket.user.fullName }, sockets: new Set() };
    entry.sockets.add(socket.id);
    online.set(id, entry);
    publishPresence();
    let lastSent = 0;
    socket.on('sendMessage', async (payload, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      try {
        // Revalidate expiry and account status; never trust a sender supplied by a client.
        await authenticate(socket.handshake.auth?.token);
        if (typeof payload?.content !== 'string' || !payload.content.trim() || payload.content.trim().length > 2000) {
          return ack({ error: 'Messages must contain 1–2000 characters' });
        }
        if (Date.now() - lastSent < 500) return ack({ error: 'Please wait before sending another message' });
        lastSent = Date.now();
        const message = await Message.create({ sender: id, content: payload.content.trim() });
        await message.populate('sender', 'fullName');
        io.emit('message', message);
        ack({ message });
      } catch { ack({ error: 'Unable to send. Check your connection or sign in again.' }); }
    });
    const check = setInterval(async () => {
      try { await authenticate(socket.handshake.auth?.token); }
      catch { socket.disconnect(true); }
    }, 60000);
    socket.on('disconnect', () => {
      clearInterval(check);
      entry.sockets.delete(socket.id);
      if (!entry.sockets.size) online.delete(id);
      publishPresence();
    });
  });
};
