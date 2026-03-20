const User = require('../models/User');

// @desc    Get all staff
// @route   GET /api/staff
// @access  Private (Admin/HR)
const getStaff = async (req, res) => {
  try {
    const staff = await User.find({}).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single staff profile
// @route   GET /api/staff/:id
// @access  Private
const getStaffById = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id).select('-password');
    if (staff) {
      res.json(staff);
    } else {
      res.status(404).json({ message: 'Staff member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update staff profile
// @route   PUT /api/staff/:id
// @access  Private (Admin/HR or Self)
const updateStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);

    if (staff) {
      // Check if updating self or is admin/HR
      if (req.user.role === 'Admin' || req.user.role === 'HR' || req.user._id.toString() === staff._id.toString()) {
        staff.name = req.body.name || staff.name;
        staff.email = req.body.email || staff.email;
        staff.phone = req.body.phone || staff.phone;
        
        // Only Admin/HR can update these fields
        if (req.user.role === 'Admin' || req.user.role === 'HR') {
          staff.department = req.body.department || staff.department;
          staff.role = req.body.role || staff.role;
          staff.salary = req.body.salary || staff.salary;
          staff.status = req.body.status || staff.status;
        }

        if (req.body.password) {
          staff.password = req.body.password;
        }

        const updatedStaff = await staff.save();
        res.json({
          _id: updatedStaff._id,
          name: updatedStaff.name,
          email: updatedStaff.email,
          role: updatedStaff.role,
          department: updatedStaff.department
        });
      } else {
        res.status(403).json({ message: 'Not authorized to update this profile' });
      }
    } else {
      res.status(404).json({ message: 'Staff member not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete staff profile
// @route   DELETE /api/staff/:id
// @access  Private (Admin only)
const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);

    if (staff) {
      await staff.deleteOne();
      res.json({ message: 'Staff member removed' });
    } else {
      res.status(404).json({ message: 'Staff member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff
};
