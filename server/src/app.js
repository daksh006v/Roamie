const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');

const app = express();

// Body Parser & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO instance to requests
app.use((req, res, next) => {
  req.io = req.app.get('io');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Roamie Server is running smoothly 🚀',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
