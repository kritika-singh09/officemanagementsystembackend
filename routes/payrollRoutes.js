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
  .get(protect, authorize('Admin', 'HR', 'CEO'), getPayroll)
  .post(protect, authorize('Admin', 'HR', 'CEO'), processPayroll);

router.get('/me', protect, getMyPayroll);
router.get('/stats', protect, authorize('Admin', 'HR', 'CEO'), getPayrollStats);
router.put('/salary-setup/:userId', protect, authorize('Admin', 'HR', 'CEO'), updateSalaryStructure);
router.post('/send-email/:id', protect, authorize('Admin', 'HR', 'CEO'), sendPayslipEmail);

module.exports = router;
