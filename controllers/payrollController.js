const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const nodemailer = require('nodemailer');

// @desc    Get all payroll records
// @route   GET /api/payroll
// @access  Private (Admin/HR)
const getPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.find({}).populate('user', 'name employeeId salaryStructure');
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create/Update payroll for an employee
// @route   POST /api/payroll
// @access  Private (Admin/HR)
const calculateDetailedSalary = async (uId, salStruct, monthStr) => {
  const dateObj = new Date(monthStr);
  if (isNaN(dateObj.getTime())) {
    const [mStr, yStr] = monthStr.split(' ');
    const mIdx = new Date(Date.parse(mStr + " 1, 2012")).getMonth();
    dateObj.setMonth(mIdx);
    dateObj.setFullYear(parseInt(yStr));
  }

  const m = dateObj.getMonth();
  const y = dateObj.getFullYear();
  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59);

  const attendances = await Attendance.find({
    user: uId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const dailyRate = (salStruct.basicSalary || 0) / 30;
  const absentDays = attendances.filter(a => a.status === 'Absent').length;
  const lateDays = attendances.filter(a => a.status === 'Late').length;
  
  const attendanceDeduction = absentDays * dailyRate;
  const lateDeduction = lateDays * (dailyRate * 0.1);

  const adjustedBasic = Math.max(0, (salStruct.basicSalary || 0) - attendanceDeduction - lateDeduction);
  
  const totalAllowances = salStruct.allowances || 0;
  const totalPF = salStruct.pf || 0;
  const totalTax = salStruct.tax || 0;
  const totalInsurance = salStruct.insurance || 0;
  const structDeductions = salStruct.deductions || 0;

  return {
    basicSalary: Math.round(adjustedBasic),
    allowances: totalAllowances,
    pf: totalPF,
    tax: totalTax,
    insurance: totalInsurance,
    structDeductions,
    paymentType: salStruct.paymentType || 'monthly'
  };
};

const createInitialPayroll = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const targetMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const breakdown = {
    basicSalary: user.salaryStructure.basicSalary || 0,
    allowances: user.salaryStructure.allowances || 0,
    pf: user.salaryStructure.pf || 0,
    tax: user.salaryStructure.tax || 0,
    insurance: user.salaryStructure.insurance || 0,
    structDeductions: user.salaryStructure.deductions || 0,
    paymentType: user.salaryStructure.paymentType || 'monthly'
  };

  const netSalary = (breakdown.basicSalary + breakdown.allowances) - (breakdown.structDeductions + breakdown.pf + breakdown.tax + breakdown.insurance);

  return await Payroll.create({
    user: user._id,
    month: targetMonth,
    ...breakdown,
    bonus: 0,
    deductions: breakdown.structDeductions,
    netSalary: Math.round(netSalary),
    paymentStatus: 'Pending'
  });
};

// @desc    Create/Update payroll for an employee
// @route   POST /api/payroll
// @access  Private (Admin/HR)
const processPayroll = async (req, res) => {
  const { userId, month, bonus, deductions, paymentStatus, paymentMethod } = req.body || {};
  const targetMonth = month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  try {
    if (!userId) {
      const users = await User.find({});
      const results = [];
      for (const user of users) {
        let payroll = await Payroll.findOne({ user: user._id, month: targetMonth });
        if (!payroll) {
          const breakdown = await calculateDetailedSalary(user._id, user.salaryStructure || {}, targetMonth);
          const netSalary = (breakdown.basicSalary + breakdown.allowances) - (breakdown.structDeductions + breakdown.pf + breakdown.tax + breakdown.insurance);
          
          payroll = await Payroll.create({
            user: user._id,
            month: targetMonth,
            ...breakdown,
            bonus: 0,
            deductions: breakdown.structDeductions,
            netSalary: Math.round(netSalary),
            paymentStatus: 'Pending'
          });
        }
        results.push(payroll);
      }
      return res.json({ message: 'Payroll processed for all staff', count: results.length });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const breakdown = await calculateDetailedSalary(user._id, user.salaryStructure || {}, targetMonth);
    const resolvedBonus = Number(bonus) || 0;
    const resolvedDeductions = deductions !== undefined ? Number(deductions) : breakdown.structDeductions;
    
    let payroll = await Payroll.findOne({ user: userId, month: targetMonth });

    if (payroll) {
      const finalBonus = bonus !== undefined ? Number(bonus) : payroll.bonus;
      const finalDeductions = deductions !== undefined ? Number(deductions) : payroll.deductions;
      const netSalary = (breakdown.basicSalary + breakdown.allowances + finalBonus) - (finalDeductions + breakdown.pf + breakdown.tax + breakdown.insurance);

      payroll.basicSalary = breakdown.basicSalary;
      payroll.allowances = breakdown.allowances;
      payroll.bonus = finalBonus;
      payroll.deductions = finalDeductions;
      payroll.pf = breakdown.pf;
      payroll.tax = breakdown.tax;
      payroll.insurance = breakdown.insurance;
      payroll.netSalary = Math.round(netSalary);
      payroll.paymentStatus = paymentStatus || payroll.paymentStatus;
      if (paymentStatus === 'Paid') {
        payroll.paymentDate = Date.now();
        payroll.paymentMethod = paymentMethod || payroll.paymentMethod;
      }
      
      const updatedPayroll = await payroll.save();
      return res.json(updatedPayroll);
    } else {
      const netSalary = (breakdown.basicSalary + breakdown.allowances + resolvedBonus) - (resolvedDeductions + breakdown.pf + breakdown.tax + breakdown.insurance);
      const newPayroll = await Payroll.create({
        user: userId,
        month: targetMonth,
        ...breakdown,
        bonus: resolvedBonus,
        deductions: resolvedDeductions,
        netSalary: Math.round(netSalary),
        paymentStatus: paymentStatus || 'Pending',
        paymentDate: paymentStatus === 'Paid' ? Date.now() : null,
        paymentMethod: paymentStatus === 'Paid' ? paymentMethod : null
      });
      return res.status(201).json(newPayroll);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get my payroll (payslip)
// @route   GET /api/payroll/me
// @access  Private 
const getMyPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Salary Structure for an employee
// @route   PUT /api/payroll/salary-setup/:userId
// @access  Private (Admin/HR)
const updateSalaryStructure = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.salaryStructure = {
      ...user.salaryStructure,
      ...req.body
    };

    const updatedUser = await user.save();
    res.json(updatedUser.salaryStructure);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get Payroll Stats
// @route   GET /api/payroll/stats
// @access  Private (Admin/HR)
const getPayrollStats = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }) });
    const totalCost = payrolls.reduce((acc, curr) => acc + curr.netSalary, 0);
    const paidCount = payrolls.filter(p => p.paymentStatus === 'Paid').length;
    const pendingCount = payrolls.length - paidCount;

    res.json({
      totalCost,
      paidCount,
      pendingCount,
      totalEmployees: payrolls.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send Payslip Email
// @route   POST /api/payroll/send-email/:id
// @access  Private (Admin/HR)
const sendPayslipEmail = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate('user');
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: payroll.user.email,
      subject: `Your ${payroll.month} Payslip`,
      text: `Dear ${payroll.user.name},\n\nYour salary for ${payroll.month} has been processed.\nTotal Net Salary: $${payroll.netSalary}\n\nPlease check the portal for details.\n\nBest Regards,\nHR Team`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPayroll,
  processPayroll,
  getMyPayroll,
  updateSalaryStructure,
  getPayrollStats,
  sendPayslipEmail,
  createInitialPayroll
};
