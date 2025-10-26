// server/models/Police.js
const mongoose = require('mongoose');

const PoliceSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model('Police', PoliceSchema);