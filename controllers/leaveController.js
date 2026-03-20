const Leave = require('../models/Leave');
const sendEmail = require('../utils/emailService');
const User = require('../models/User');

exports.getLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find().populate('user', 'name email employeeId department');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaves', error: error.message });
  }
};

exports.getLeavesByUser = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.params.userId }).populate('user', 'name email');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user leaves', error: error.message });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const { userId, type, startDate, endDate, reason } = req.body;
    const newLeave = new Leave({
      user: userId,
      type,
      startDate,
      endDate,
      reason
    });
    const savedLeave = await newLeave.save();
    res.status(201).json(savedLeave);
  } catch (error) {
    res.status(400).json({ message: 'Error applying for leave', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user');
    
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Send notification
    if (leave.user && leave.user.email) {
      await sendEmail({
        email: leave.user.email,
        subject: `Leave Request ${status}`,
        message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been ${status}.`
      });
    }

    res.json(leave);
  } catch (error) {
    res.status(400).json({ message: 'Error updating leave status', error: error.message });
  }
};
