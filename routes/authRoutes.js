const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getNextEmployeeId } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/next-employee-id', getNextEmployeeId);

module.exports = router;
