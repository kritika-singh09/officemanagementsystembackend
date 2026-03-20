const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: String,
  permissions: [String] // Future-proofing for permission management
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
