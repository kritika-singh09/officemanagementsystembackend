const express = require('express');
const router = express.Router();
const { 
  postAttendance, 
  getAttendance, 
  getDailyReport, 
  getAttendanceSummary, 
  requestLeave 
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .post(protect, postAttendance)
  .get(protect, getAttendance);

router.get('/summary', protect, getAttendanceSummary);
router.get('/report/daily', protect, authorize('Admin', 'HR', 'Manager'), getDailyReport);
router.post('/leave', protect, requestLeave);

module.exports = router;
