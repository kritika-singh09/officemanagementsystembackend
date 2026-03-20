const express = require('express');
const router = express.Router();
const { getRoles, createRole, deleteRole } = require('../controllers/roleController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getRoles)
  .post(protect, createRole);

router.route('/:id')
  .delete(protect, deleteRole);

module.exports = router;
