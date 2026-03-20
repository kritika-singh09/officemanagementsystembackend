const express = require('express');
const router = express.Router();
const { 
  getPayroll, 
  processPayroll, 
  getMyPayroll, 
  updateSalaryStructure,
  getPayrollStats,
  sendPayslipEmail
} = require('../controllers/payrollController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(protect, authorize('Admin', 'HR'), getPayroll)
  .post(protect, authorize('Admin', 'HR'), processPayroll);

router.get('/me', protect, getMyPayroll);
router.get('/stats', protect, authorize('Admin', 'HR'), getPayrollStats);
router.put('/salary-setup/:userId', protect, authorize('Admin', 'HR'), updateSalaryStructure);
router.post('/send-email/:id', protect, authorize('Admin', 'HR'), sendPayslipEmail);

module.exports = router;
