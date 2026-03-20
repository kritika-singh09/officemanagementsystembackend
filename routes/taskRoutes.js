const express = require('express');
const router = express.Router();
const { getTasks, getTaskById, createTask, updateTask, deleteTask, addComment, uploadAttachment, getTaskAnalytics } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

router.get('/analytics', protect, getTaskAnalytics);

router.route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.route('/:id')
  .get(protect, getTaskById)
  .put(protect, updateTask)
  .delete(protect, authorize('Admin', 'CEO'), deleteTask);

router.route('/:id/comments')
  .post(protect, addComment);

router.post('/:id/attachments', protect, upload.single('file'), uploadAttachment);

module.exports = router;
