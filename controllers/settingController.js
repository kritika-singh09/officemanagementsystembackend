const Setting = require('../models/Setting');

// @desc    Get global settings
// @route   GET /api/settings/office
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update global settings
// @route   PUT /api/settings/office
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    
    settings.officeStartTime = req.body.officeStartTime || settings.officeStartTime;
    settings.officeEndTime = req.body.officeEndTime || settings.officeEndTime;
    settings.gracePeriod = req.body.gracePeriod !== undefined ? req.body.gracePeriod : settings.gracePeriod;
    settings.paymentDate = req.body.paymentDate !== undefined ? req.body.paymentDate : settings.paymentDate;
    settings.updatedBy = req.user._id;

    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSettings, updateSettings };
