const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(token) {
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
  }
  const user = await User.findById(payload.id).select('-password');
  if (!user) throw Object.assign(new Error('Account not found'), { status: 401 });
  if (!user.isActive || !user.isApproved) {
    throw Object.assign(new Error('Account is inactive or awaiting approval'), { status: 403 });
  }
  return user;
}

async function protect(req, res, next) {
  try {
    req.user = await authenticate(req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1]);
    next();
  } catch (error) { next(error); }
}
module.exports = { protect, authenticate };
