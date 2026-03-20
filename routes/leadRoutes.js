const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3Upload = require('../middleware/upload');
const path = require('path');
const {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  addActivity,
  uploadAttachment,
  getLeadAnalytics,
  exportLeads,
  sendLeadEmail,
  importLeads
} = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.route('/')
  .get(protect, getLeads)
  .post(protect, createLead);

router.get('/analytics', protect, getLeadAnalytics);
router.get('/export', protect, exportLeads);
router.post('/import', protect, upload.single('file'), importLeads);

router.route('/:id')
  .put(protect, updateLead)
  .delete(protect, deleteLead);

router.post('/:id/activities', protect, addActivity);
router.post('/:id/attachments', protect, s3Upload.single('file'), uploadAttachment);
router.post('/:id/send-email', protect, sendLeadEmail);

module.exports = router;
