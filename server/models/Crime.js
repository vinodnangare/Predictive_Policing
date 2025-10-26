// server/models/Crime.js
const mongoose = require('mongoose');

const CrimeSchema = new mongoose.Schema({
  type: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
});

module.exports = mongoose.model('Crime', CrimeSchema);