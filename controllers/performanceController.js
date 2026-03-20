const Performance = require('../models/Performance');

exports.getPerformances = async (req, res) => {
  try {
    const records = await Performance.find().populate('user', 'name employeeId department');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance records', error: error.message });
  }
};

exports.getPerformanceByUser = async (req, res) => {
  try {
    const records = await Performance.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance', error: error.message });
  }
};

exports.addPerformance = async (req, res) => {
  try {
    const { userId, month, tasksCompleted, attendancePercentage, managerRating, productivityScore, comments } = req.body;
    const record = new Performance({
      user: userId,
      month,
      tasksCompleted,
      attendancePercentage,
      managerRating,
      productivityScore,
      comments
    });
    const savedRecord = await record.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(400).json({ message: 'Error adding performance record', error: error.message });
  }
};

exports.updatePerformance = async (req, res) => {
  try {
    const updatedRecord = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRecord) return res.status(404).json({ message: 'Performance record not found' });
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: 'Error updating performance', error: error.message });
  }
};

exports.deletePerformance = async (req, res) => {
  try {
    const record = await Performance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Performance record not found' });
    res.json({ message: 'Performance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting performance', error: error.message });
  }
};
