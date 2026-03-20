const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Helper to calculate hours between two "HH:mm" strings
const calculateHours = (start, end) => {
  if (!start || !end || start === '--:--' || end === '--:--') return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const diff = (eH * 60 + eM) - (sH * 60 + sM);
  return diff > 0 ? (diff / 60).toFixed(2) : 0;
};

// @desc    Check-in or Update check-out
// @route   POST /api/attendance
// @access  Private
const postAttendance = async (req, res) => {
  const { date, checkIn, checkOut, status, userId: bodyUserId, location } = req.body;
  
  // Only Admin/HR/Manager can update another user's attendance
  let targetUserId = req.user._id;
  if (bodyUserId && ['Admin', 'HR', 'Manager'].includes(req.user.role)) {
    targetUserId = bodyUserId;
  }

  try {
    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ user: targetUserId, date: targetDate });

    if (attendance) {
      // Logic for Update/Check-out
      if (checkIn !== undefined) attendance.checkIn = checkIn;
      if (checkOut !== undefined) {
          attendance.checkOut = checkOut;
          attendance.totalHours = calculateHours(attendance.checkIn, checkOut);
      }
      if (status !== undefined) attendance.status = status;
      if (location !== undefined) attendance.location = location;
      
      const updatedAttendance = await attendance.save();
      return res.json(updatedAttendance);
    } else {
      // Logic for New Check-in
      const timeStr = checkIn || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
      // Auto-determine status if not provided (Late if after 09:30)
      let finalStatus = status || 'Present';
      const [h, m] = timeStr.split(':').map(Number);
      if (!status && (h > 9 || (h === 9 && m > 30))) {
          finalStatus = 'Late';
      }

      const newAttendance = await Attendance.create({
        user: targetUserId,
        date: targetDate,
        checkIn: timeStr,
        checkOut: checkOut || '--:--',
        status: finalStatus,
        location: location || null
      });
      return res.status(201).json(newAttendance);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  const { date, month, year } = req.query;
  try {
    let query = {};
    if (!['Admin', 'HR', 'Manager'].includes(req.user.role)) {
      query = { user: req.user._id };
    }

    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      query.date = searchDate;
    } else if (month && year) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const attendance = await Attendance.find(query)
      .populate('user', 'name role employeeId email')
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily attendance report for Admin Dashboard
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const allStaff = await User.find({}, 'name role employeeId');
    const attendance = await Attendance.find({ date: targetDate }).populate('user', 'name role employeeId');
    
    const details = allStaff.map(staff => {
      const record = attendance.find(a => a.user && a.user._id.toString() === staff._id.toString());
      return {
        _id: record?._id || null,
        user: staff,
        date: targetDate,
        checkIn: record?.checkIn || '--:--',
        checkOut: record?.checkOut || '--:--',
        status: record?.status || 'Absent',
        totalHours: record?.totalHours || 0
      };
    });

    res.json({
      date: targetDate.toISOString().split('T')[0],
      total: details.length,
      present: details.filter(d => d.status === 'Present').length,
      absent: details.filter(d => d.status === 'Absent').length,
      late: details.filter(d => d.status === 'Late').length,
      onLeave: details.filter(d => d.status === 'Leave').length,
      details
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly summary for charts
const getAttendanceSummary = async (req, res) => {
  try {
    const { month, year, userId } = req.query;
    const targetUserId = userId || req.user._id;
    
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const attendance = await Attendance.find({
      user: targetUserId,
      date: { $gte: start, $lte: end }
    });

    const stats = {
      Present: attendance.filter(a => a.status === 'Present').length,
      Late: attendance.filter(a => a.status === 'Late').length,
      Absent: attendance.filter(a => a.status === 'Absent').length,
      Leave: attendance.filter(a => a.status === 'Leave').length,
      HalfDay: attendance.filter(a => a.status === 'Half Day').length,
    };

    res.json({
      month: m,
      year: y,
      stats: Object.entries(stats).map(([name, value]) => ({ name, value })),
      totalDays: attendance.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const requestLeave = async (req, res) => {
  // Logic remains similar but cleaned up
  try {
    const { startDate, endDate, userId: bodyUserId } = req.body;
    const userId = bodyUserId || req.user._id;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateToCheck = new Date(d);
      dateToCheck.setHours(0, 0, 0, 0);
      
      // Skip weekends (optional business logic)
      if (dateToCheck.getDay() !== 0 && dateToCheck.getDay() !== 6) {
        await Attendance.findOneAndUpdate(
          { user: userId, date: dateToCheck },
          { status: 'Leave', checkIn: '--:--', checkOut: '--:--' },
          { upsert: true, new: true }
        );
      }
    }
    res.status(201).json({ message: 'Leave correctly marked in attendance' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  postAttendance,
  getAttendance,
  getDailyReport,
  getAttendanceSummary,
  requestLeave
};