const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocketIO } = require('./sockets/socketHandler');
const { initReminderCron } = require('./services/reminderCronService');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

initSocketIO(io);

// Provide io instance to Express app
app.set('io', io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Roamie Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  initReminderCron();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
