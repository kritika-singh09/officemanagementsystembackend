const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');

router.get('/', leaveController.getLeaves);
router.get('/user/:userId', leaveController.getLeavesByUser);
router.post('/', leaveController.applyLeave);
router.put('/:id/status', leaveController.updateLeaveStatus);

module.exports = router;
