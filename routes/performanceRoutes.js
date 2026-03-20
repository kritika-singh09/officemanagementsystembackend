const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');

router.get('/', performanceController.getPerformances);
router.get('/user/:userId', performanceController.getPerformanceByUser);
router.post('/', performanceController.addPerformance);
router.put('/:id', performanceController.updatePerformance);
router.delete('/:id', performanceController.deletePerformance);

module.exports = router;
