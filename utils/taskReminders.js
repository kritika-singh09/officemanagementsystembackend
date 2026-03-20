const cron = require('node-cron');
const Task = require('../models/Task');
const sendEmail = require('./sendEmail');

// Run every hour to check for overdue tasks
cron.schedule('0 * * * *', async () => {
  console.log('Running Task Reminder Cron Job...');
  try {
    const now = new Date();
    
    // Find pending/in-progress tasks that just became overdue
    const overdueTasks = await Task.find({
      status: { $nin: ['Completed', 'Overdue'] },
      deadline: { $lt: now }
    }).populate('assignedTo', 'name email');

    for (const task of overdueTasks) {
      task.status = 'Overdue';
      task.activities.push({
        type: 'Status Change',
        note: 'Task marked as overdue automatically.',
      });
      await task.save();

      // Send email reminder
      if (task.assignedTo && task.assignedTo.email) {
        try {
          await sendEmail({
            to: task.assignedTo.email,
            subject: `Task Overdue: ${task.title}`,
            text: `Hello ${task.assignedTo.name},\n\nThis is an automated reminder that your task "${task.title}" is now OVERDUE.\nPlease update its status as soon as possible.\n\nThank you,\nSystem Admin`,
            senderName: 'Office System'
          });
          console.log(`Sent overdue email for task: ${task._id}`);
        } catch (emailErr) {
          console.error(`Failed to send overdue email for ${task._id}`, emailErr.message);
        }
      }
    }
    
    if (overdueTasks.length > 0) {
      console.log(`Marked ${overdueTasks.length} tasks as overdue.`);
      // We would ideally emit a socket event here, but since this runs outside a request context
      // we just let users fetch the latest status on next load, or we could require 'io' directly.
    }
  } catch (error) {
    console.error('Error in Task Reminder Cron:', error);
  }
});

module.exports = cron;
