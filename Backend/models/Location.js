const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true,
    trim: true
  },
  upazila: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

locationSchema.index({ district: 1, upazila: 1 }, { unique: true });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
