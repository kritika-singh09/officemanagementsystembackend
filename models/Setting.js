const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  officeStartTime: {
    type: String,
    default: '09:00'
  },
  officeEndTime: {
    type: String,
    default: '18:00'
  },
  gracePeriod: {
    type: Number,
    default: 30 // minutes
  },
  paymentDate: {
    type: Number,
    default: 5 // Default payment date is 5th of every month
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
