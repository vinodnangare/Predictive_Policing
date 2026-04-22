// server/models/Police.js
const mongoose = require('mongoose');

const PoliceSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  badgeNumber: { type: String },
  rank: { type: String, default: 'Officer' },
  department: { type: String },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
  assignedCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crime' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Police', PoliceSchema);