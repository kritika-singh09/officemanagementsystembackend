const Lead = require('../models/Lead');
const User = require('../models/User');
const { Parser } = require('json2csv');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({}).populate('assignedTo', 'name').populate('activities.staff', 'name');
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a lead
// @route   POST /api/leads
// @access  Private
const createLead = async (req, res) => {
  const { name, companyName, phone, email, source, status, score, nextFollowUpDate, followUpType, notes, assignedTo } = req.body;

  try {
    const lead = await Lead.create({
      name,
      companyName,
      phone,
      email,
      source: source || 'Website',
      status: status || 'New',
      score: score || 0,
      nextFollowUpDate,
      followUpType,
      notes,
      assignedTo: assignedTo || req.user._id,
      activities: [{
        type: 'Note',
        note: 'Lead created',
        staff: req.user._id
      }]
    });

    // Notify assignee if someone else assigned it to them
    if (lead.assignedTo && lead.assignedTo.toString() !== req.user._id.toString()) {
      try {
        const assignee = await User.findById(lead.assignedTo);
        if (assignee) {
          const io = req.app.get('io');
          if (io) {
            io.to(assignee._id.toString()).emit('notification', {
              title: 'New Lead Assigned',
              message: `You have been assigned a new lead: ${lead.name}`,
              type: 'lead_assigned'
            });
          }
          if (assignee.email) {
            sendEmail({
              to: assignee.email,
              subject: 'New Lead Assigned to You',
              text: `Hello ${assignee.name},\n\nYou have been assigned a new lead: ${lead.name} (${lead.companyName || 'No Company'}).\nPlease check the CRM dashboard to view details.`
            }).catch(e => console.error("Notification Email Error:", e));
          }
        }
      } catch (notifyErr) {
        console.error("Failed to notify user:", notifyErr);
      }
    }

    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (lead) {
      const oldStatus = lead.status;
      const oldAssignedTo = lead.assignedTo ? lead.assignedTo.toString() : null;
      
      lead.name = req.body.name || lead.name;
      lead.companyName = req.body.companyName || lead.companyName;
      lead.phone = req.body.phone || lead.phone;
      lead.email = req.body.email || lead.email;
      lead.status = req.body.status || lead.status;
      lead.source = req.body.source || lead.source;
      lead.score = req.body.score !== undefined ? req.body.score : lead.score;
      lead.nextFollowUpDate = req.body.nextFollowUpDate !== undefined ? req.body.nextFollowUpDate : lead.nextFollowUpDate;
      lead.followUpType = req.body.followUpType || lead.followUpType;
      lead.notes = req.body.notes !== undefined ? req.body.notes : lead.notes;
      if (req.body.assignedTo) lead.assignedTo = req.body.assignedTo;

      // Log status change activity
      if (req.body.status && req.body.status !== oldStatus) {
        lead.activities.push({
          type: 'Status Change',
          note: `Status changed from ${oldStatus} to ${lead.status}`,
          staff: req.user ? req.user._id : null
        });
      }

      // Notify new assignee if changed
      if (req.body.assignedTo &&
          req.body.assignedTo.toString() !== oldAssignedTo &&
          (!req.user || req.body.assignedTo.toString() !== req.user._id.toString())) {
        try {
          const assignee = await User.findById(req.body.assignedTo);
          if (assignee) {
            const io = req.app.get('io');
            if (io) {
              io.to(assignee._id.toString()).emit('notification', {
                title: 'Lead Reassigned',
                message: `Lead ${lead.name} has been reassigned to you.`,
                type: 'lead_assigned'
              });
            }
            if (assignee.email) {
              sendEmail({
                to: assignee.email,
                subject: 'Lead Reassigned to You',
                text: `Hello ${assignee.name},\n\nThe lead ${lead.name} (${lead.companyName || 'No Company'}) has been reassigned to you.\nPlease check the CRM dashboard.`
              }).catch(e => console.error("Notification Email Error:", e));
            }
          }
        } catch (notifyErr) {
          console.error("Failed to notify user:", notifyErr);
        }
      }

      const updatedLead = await lead.save();
      res.json(updatedLead);
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (lead) {
      await lead.deleteOne();
      res.json({ message: 'Lead removed' });
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add activity to lead
// @route   POST /api/leads/:id/activities
// @access  Private
const addActivity = async (req, res) => {
  const { type, note } = req.body;
  try {
    const lead = await Lead.findById(req.params.id);
    if (lead) {
      lead.activities.push({
        type,
        note,
        staff: req.user._id
      });
      
      // Auto-scoring logic
      if (type === 'Email') lead.score += 10;
      if (type === 'Call') lead.score += 5;
      if (type === 'Meeting') lead.score += 20;

      await lead.save();
      res.status(201).json(lead);
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload attachment
// @route   POST /api/leads/:id/attachments
// @access  Private
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const lead = await Lead.findById(req.params.id);
    if (lead) {
      lead.attachments.push({
        name: req.file.originalname,
        url: req.file.location || `/uploads/${req.file.filename}`
      });
      await lead.save();
      res.status(201).json(lead);
    } else {
      res.status(404).json({ message: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Lead Analytics
// @route   GET /api/leads/analytics
// @access  Private
const getLeadAnalytics = async (req, res) => {
  try {
    const leads = await Lead.find({});
    
    // Source Stats
    const sourceStats = leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {});

    // Monthly Trends
    const monthlyStats = leads.reduce((acc, lead) => {
      const month = lead.createdAt.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Status Stats
    const statusStats = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      sourceStats: Object.entries(sourceStats).map(([name, value]) => ({ name, value })),
      monthlyStats: Object.entries(monthlyStats).map(([name, leads]) => ({ name, leads })),
      statusStats: Object.entries(statusStats).map(([name, value]) => ({ name, value })),
      totalLeads: leads.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export Leads to CSV
// @route   GET /api/leads/export
// @access  Private
const exportLeads = async (req, res) => {
  try {
    const leads = await Lead.find({}).lean();
    const fields = ['name', 'companyName', 'phone', 'email', 'source', 'status', 'score', 'createdAt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(leads);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('leads.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send Email to Lead
// @route   POST /api/leads/:id/send-email
// @access  Private
const sendLeadEmail = async (req, res) => {
  const { subject, body } = req.body;
  try {
    const lead = await Lead.findById(req.params.id);
    // Use centralized email utility
    try {
      await sendEmail({
        to: lead.email,
        subject: subject,
        text: body,
        senderName: req.user.name
      });

      lead.activities.push({
        type: 'Email',
        note: `Sent Email: ${subject}`,
        staff: req.user._id
      });
      lead.score += 10;
      await lead.save();

      res.json({ message: 'Email sent successfully', lead });
    } catch (sendError) {
      console.error('Email sending failed:', sendError);
      res.status(500).json({ message: 'Failed to send email. Check your SMTP credentials in .env.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import Leads from CSV
// @route   POST /api/leads/import
// @access  Private
const importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const leads = [];
    fs.createReadStream(req.file.path)
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on('data', (data) => {
        const name = data.name || data['full name'] || data['contact name'];
        const phone = data.phone || data['phone number'] || data.mobile || data.contact;

        if (name && phone) {
          leads.push({
            name,
            companyName: data.companyname || data.company || data['company name'] || '',
            email: data.email || data['email address'] || '',
            phone,
            source: data.source || 'Website',
            status: data.status || 'New',
            score: parseInt(data.score) || 0,
            notes: data.notes || '',
            assignedTo: req.user._id // Assign to the person importing
          });
        }
      })
      .on('end', async () => {
        try {
          if (leads.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'No valid leads found. Please ensure CSV has at least "name" and "phone" columns.' });
          }
          await Lead.insertMany(leads);
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Delete temp file
          res.status(201).json({ message: `${leads.length} leads imported successfully` });
        } catch (err) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          res.status(400).json({ message: 'Error saving imported leads: ' + err.message });
        }
      });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
