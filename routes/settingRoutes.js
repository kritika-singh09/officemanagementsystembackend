const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/office')
  .get(protect, getSettings)
  .put(protect, authorize('Admin', 'CEO'), updateSettings);

module.exports = router;
