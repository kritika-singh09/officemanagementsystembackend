const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Task Reminders Utility
require('./utils/taskReminders');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/leads', require('./routes/leadRoutes'));
app.use('/staff', require('./routes/staffRoutes'));
app.use('/tasks', require('./routes/taskRoutes'));
app.use('/attendance', require('./routes/attendanceRoutes'));
app.use('/payroll', require('./routes/payrollRoutes'));
app.use('/departments', require('./routes/departmentRoutes'));
app.use('/roles', require('./routes/roleRoutes'));
app.use('/leaves', require('./routes/leaveRoutes'));
app.use('/performance', require('./routes/performanceRoutes'));
app.use('/documents', require('./routes/documentRoutes'));
app.use('/upload', require('./routes/uploadRoutes'));

// Serve Build / UI
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});