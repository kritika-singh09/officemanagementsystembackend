const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // e.g., "March 2026"
    required: true
  },
  basicSalary: {
    type: Number,
    required: true
  },
  allowances: {
    type: Number,
    default: 0
  },
  bonus: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  pf: {
    type: Number,
    default: 0
  },
  insurance: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Processing', 'Failed'],
    default: 'Pending'
  },
  paymentDate: Date,
  paymentType: {
    type: String,
    enum: ['monthly', 'hourly'],
    default: 'monthly'
  }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
