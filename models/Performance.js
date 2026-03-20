const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // e.g., "March 2026"
    required: true
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    default: 0
  },
  managerRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  productivityScore: {
    type: Number, // 0-100
    default: 0
  },
  comments: String
}, { timestamps: true });

module.exports = mongoose.model('Performance', performanceSchema);
