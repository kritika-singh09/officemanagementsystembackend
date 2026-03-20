const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Resume', 'ID Proof', 'Contract', 'Certificate', 'Other'],
    default: 'Other'
  },
  fileUrl: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
