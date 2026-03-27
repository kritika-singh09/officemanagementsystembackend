const Task = require('../models/Task');
const { createNotification } = require('./notificationController');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    if (!['Admin', 'HR', 'Manager', 'CEO'].includes(req.user.role)) {
      query = { 
        $or: [
          { assignedTo: req.user._id },
          { 'activities.staff': req.user._id }
        ]
      };
    }
    const tasks = await Task.find(query).populate('assignedTo', 'name role').populate('activities.staff', 'name');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name role email')
      .populate('comments.user', 'name role');
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const { title, description, assignedTo, startDate, deadline, priority } = req.body;
  try {
    const task = await Task.create({
      title,
      description,
      assignedTo,
      startDate,
      deadline,
      priority,
      activities: [{
        activityType: 'Created',
        note: 'Task was created.',
        staff: req.user._id
      }]
    });
    const populatedTask = await Task.findById(task._id).populate('assignedTo', 'name role email');
    
    // Create notification for assigned user
    if (assignedTo) {
      await createNotification(
        assignedTo,
        `New task assigned: ${title}`,
        'task',
        req.user._id,
        task._id,
        req
      );
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldStatus = task.status;
    const canUpdateAll = ['Admin', 'HR', 'Manager', 'CEO'].includes(req.user.role);
    const isAssigned = task.assignedTo.toString() === req.user._id.toString();

    if (canUpdateAll) {
      task.title = req.body.title || task.title;
      task.description = req.body.description !== undefined ? req.body.description : task.description;
      if (req.body.assignedTo && task.assignedTo.toString() !== req.body.assignedTo) {
        task.activities.push({ activityType: 'Reassigned', note: 'Task reassigned to a different user.', staff: req.user._id });
        task.assignedTo = req.body.assignedTo;
        
        // Notify new assignee
        await createNotification(
          task.assignedTo,
          `Task reassigned to you: ${task.title}`,
          'task',
          req.user._id,
          task._id,
          req
        );
      }
      task.startDate = req.body.startDate || task.startDate;
      task.deadline = req.body.deadline || task.deadline;
      task.priority = req.body.priority || task.priority;
      task.status = req.body.status || task.status;
      task.progress = req.body.progress !== undefined ? req.body.progress : task.progress;
    } else if (isAssigned) {
      task.status = req.body.status || task.status;
      task.progress = req.body.progress !== undefined ? req.body.progress : task.progress;
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.body.subtasks) {
      task.subtasks = req.body.subtasks;
      if (task.subtasks.length > 0) {
        const completed = task.subtasks.filter(s => s.completed).length;
        task.progress = Math.round((completed / task.subtasks.length) * 100);
      }
    }

    if (req.body.status && req.body.status !== oldStatus) {
      task.activities.push({ activityType: 'Status Change', note: `Status changed from ${oldStatus} to ${task.status}`, staff: req.user._id });
      if (task.status === 'Completed') task.progress = 100;
      if (task.status === 'Pending') task.progress = 0;
    }

    await task.save();
    const populatedTask = await Task.findById(task._id).populate('assignedTo', 'name role email');
    res.json(populatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      await task.deleteOne();
      res.json({ message: 'Task removed' });
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add comment
const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      task.comments.push({ user: req.user._id, text: req.body.text });
      task.activities.push({ activityType: 'Comment', note: 'Added a new comment.', staff: req.user._id });
      await task.save();
      const updatedTask = await Task.findById(task._id).populate('assignedTo', 'name role email').populate('comments.user', 'name role');
      res.json(updatedTask);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload attachment
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const task = await Task.findById(req.params.id);
    if (task) {
      task.attachments.push({ name: req.file.originalname, url: req.file.location || `/uploads/${req.file.filename}` });
      task.activities.push({ activityType: 'Attachment', note: `Uploaded file: ${req.file.originalname}`, staff: req.user._id });
      await task.save();
      const updatedTask = await Task.findById(task._id).populate('assignedTo', 'name role email');
      res.status(201).json(updatedTask);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get Task Analytics
const getTaskAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({});
    const statusStats = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
    const priorityStats = tasks.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {});
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date()).length;
    res.json({
      totalTasks: tasks.length,
      statusStats: Object.entries(statusStats).map(([name, value]) => ({ name, value })),
      priorityStats: Object.entries(priorityStats).map(([name, value]) => ({ name, value })),
      overdueTasks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, addComment, uploadAttachment, getTaskAnalytics };
