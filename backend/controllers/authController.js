const User = require('../models/User');
const jwt = require('jsonwebtoken');

const publicUser = user => ({ _id: user._id, email: user.email, fullName: user.fullName,
  role: user.role, department: user.department, designation: user.designation });

async function registerUser(req, res) {
  const { email, password, fullName, department, designation } = req.body;
  if (typeof email !== 'string' || typeof fullName !== 'string' || !fullName.trim() ||
      typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: 'Provide a name, email, and password of 8–72 bytes' });
  }
  await User.create({ email: email.trim().toLowerCase(), password, fullName: fullName.trim(),
    department, designation, role: 'INTERN', isApproved: false });
  res.status(201).json({ message: 'Registration received. An administrator must approve your account before you can sign in.' });
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive || !user.isApproved) {
    return res.status(403).json({ message: 'Account is inactive or awaiting administrator approval' });
  }
  user.currentLoginTime = new Date();
  await user.save();
  res.json({ ...publicUser(user), token: jwt.sign({ id: user.id }, process.env.JWT_SECRET,
    { expiresIn: '12h', algorithm: 'HS256' }) });
}
module.exports = { registerUser, loginUser, publicUser };
