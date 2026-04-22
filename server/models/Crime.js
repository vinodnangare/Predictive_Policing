// server/models/Crime.js
const mongoose = require('mongoose');

const CrimeSchema = new mongoose.Schema({
  type: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  description: { type: String, required: true },
  firNo: { type: String, trim: true },
  section: { type: String, trim: true },
  policeStation: { type: String, trim: true },
  fingerprint: { type: String, index: true },
  
  // Hierarchical location fields
  state: { type: String },
  district: { type: String },
  subdistrict: { type: String },
  village: { type: String },
  
  // Case Management Fields
  caseStatus: { 
    type: String, 
    enum: ['Open', 'Under Investigation', 'Solved', 'Closed', 'Cold Case'],
    default: 'Open'
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  
  // Officer Assignment
  assignedOfficer: { type: String },
  assignedOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Police' },
  
  // Case Notes
  notes: [
    {
      date: { type: Date, default: Date.now },
      officer: String,
      content: String
    }
  ],
  
  // Linked Crimes
  linkedCrimes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crime' }],
  
  // Evidence & Suspects
  suspects: [String],
  evidence: [String],
  
  // Risk & Pattern
  riskScore: { type: Number, min: 0, max: 100, default: 50 },
  patternType: { type: String }, // Serial, Gang-related, Random, etc.
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crime', CrimeSchema);