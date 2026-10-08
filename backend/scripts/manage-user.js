require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
async function main() {
  const [command, email] = process.argv.slice(2);
  if (!['create-admin', 'approve'].includes(command) || !email) throw new Error('Usage: npm run user -- create-admin|approve email');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/progtrack_mern');
  if (command === 'approve') {
    const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { isApproved: true });
    if (!user) throw new Error('User not found');
  } else {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('Set ADMIN_PASSWORD to 8–72 bytes');
    await User.create({ email, password, fullName: process.env.ADMIN_NAME || 'Administrator', role: 'ADMIN', isApproved: true });
  }
  console.log('Account updated');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
