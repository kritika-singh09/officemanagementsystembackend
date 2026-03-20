const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  companyName: String,
  phone: {
    type: String,
    required: true
  },
  email: String,
  source: {
    type: String,
    enum: ['Website', 'Facebook Ads', 'Google Ads', 'Referral', 'Cold Call'],
    default: 'Website'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'],
    default: 'New'
  },
  score: {
    type: Number,
    default: 0
  },
  nextFollowUpDate: Date,
  followUpType: {
    type: String,
    enum: ['Call', 'Meeting', 'Email', 'Other']
  },
  notes: String,
  activities: [{
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Note', 'Status Change'],
      required: true
    },
    note: String,
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
