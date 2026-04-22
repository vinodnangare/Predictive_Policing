const mongoose = require('mongoose');

const SuspectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  aliases: [{ type: String, trim: true }],
  age: { type: Number, min: 1, max: 120 },
  height: { type: String, trim: true },
  gender: { type: String, trim: true },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Active', 'Under Watch', 'Detained', 'Cleared'],
    default: 'Active',
  },
  primaryType: { type: String, trim: true },
  lastSeenDate: { type: Date },
  lastSeenLocation: { type: String, trim: true },
  description: { type: String, trim: true },
  linkedCrimes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crime' }],
  notes: [
    {
      date: { type: Date, default: Date.now },
      officer: { type: String, trim: true },
      content: { type: String, trim: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SuspectSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Suspect', SuspectSchema);
