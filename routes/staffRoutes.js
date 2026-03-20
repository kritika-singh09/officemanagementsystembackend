const express = require('express');
const router = express.Router();
const { getStaff, getStaffById, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(protect, getStaff);

router.route('/:id')
  .get(protect, getStaffById)
  .put(protect, updateStaff)
  .delete(protect, deleteStaff);

module.exports = router;
