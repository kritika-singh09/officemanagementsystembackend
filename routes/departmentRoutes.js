const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, deleteDepartment } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getDepartments)
  .post(protect, createDepartment);

router.route('/:id')
  .delete(protect, deleteDepartment);

module.exports = router;
