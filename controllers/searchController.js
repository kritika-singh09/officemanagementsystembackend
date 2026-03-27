const Task = require('../models/Task');
const User = require('../models/User');
const Lead = require('../models/Lead');

// @desc    Global search across Tasks, Staff, and Leads
// @route   GET /api/search
// @access  Private
const globalSearch = async (req, res) => {
  const query = req.query.q ? req.query.q.trim() : '';

  if (!query || query.length < 2) {
    return res.json({ tasks: [], staff: [], leads: [] });
  }

  try {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');
    
    // Find matching Users first to use their IDs in other searches
    const matchingUsers = await User.find({
      $or: [
        { name: regex },
        { email: regex },
        { department: regex },
        { employeeId: regex },
        { role: regex }
      ]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);

    // Search Tasks (by title, description, or assigned staff)
    const tasks = await Task.find({
      $or: [
        { title: regex },
        { description: regex },
        { assignedTo: { $in: userIds } }
      ]
    }).limit(5).select('title status');

    // Search Staff (Users)
    const staff = await User.find({
      $or: [
        { name: regex },
        { email: regex },
        { department: regex },
        { employeeId: regex },
        { role: regex },
        { phone: regex }
      ]
    }).limit(5).select('name role department employeeId');

    // Search Leads (by name, company, email, phone, or assigned staff)
    const leads = await Lead.find({
      $or: [
        { name: regex },
        { companyName: regex },
        { email: regex },
        { phone: regex },
        { assignedTo: { $in: userIds } }
      ]
    }).limit(5).select('name companyName status phone');

    res.json({
      tasks,
      staff,
      leads
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  globalSearch
};
