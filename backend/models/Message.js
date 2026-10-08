const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });
schema.index({ createdAt: -1 });
module.exports = mongoose.model('Message', schema);
