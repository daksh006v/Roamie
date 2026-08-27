const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RoomMember = require('../models/RoomMember');
const Message = require('../models/Message');

const initSocketIO = (io) => {
  // Socket.IO Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'roamie_super_secret_jwt_key_2026_dev');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.user._id})`);

    // 1. Join Room Channel with authorization check
    socket.on('join_room', async ({ roomId }, callback) => {
      try {
        if (!roomId) {
          if (callback) callback({ success: false, error: 'Room ID is required' });
          return;
        }

        // Verify user is a member of this room
        const membership = await RoomMember.findOne({
          roomId,
          userId: socket.user._id,
        });

        if (!membership) {
          if (callback) callback({ success: false, error: 'Not authorized for this room' });
          return;
        }

        const roomChannel = `room:${roomId}`;
        socket.join(roomChannel);
        console.log(`👤 ${socket.user.name} joined socket room: ${roomChannel}`);

        if (callback) {
          callback({ success: true, room: roomChannel });
        }
      } catch (error) {
        console.error('Socket join_room error:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 2. Leave Room Channel
    socket.on('leave_room', ({ roomId }) => {
      const roomChannel = `room:${roomId}`;
      socket.leave(roomChannel);
      console.log(`🚪 ${socket.user.name} left socket room: ${roomChannel}`);
    });

    // 3. Real-time Send Message via Socket
    socket.on('send_message', async ({ roomId, text, mediaUrl, messageType }, callback) => {
      try {
        if (!roomId || (!text && !mediaUrl)) {
          if (callback) callback({ success: false, error: 'Message content is required' });
          return;
        }

        // Verify membership
        const membership = await RoomMember.findOne({
          roomId,
          userId: socket.user._id,
        });

        if (!membership) {
          if (callback) callback({ success: false, error: 'Not authorized to send messages in this room' });
          return;
        }

        const message = await Message.create({
          roomId,
          senderId: socket.user._id,
          text: text || '',
          mediaUrl: mediaUrl || '',
          messageType: messageType || (mediaUrl ? 'image' : 'text'),
        });

        const populatedMessage = await Message.findById(message._id).populate('senderId', 'name avatar email');

        // Broadcast to all sockets in room (including sender or excluding sender if client handles optimistically)
        io.to(`room:${roomId}`).emit('new_message', populatedMessage);

        if (callback) {
          callback({ success: true, message: populatedMessage });
        }
      } catch (error) {
        console.error('Socket send_message error:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 4. Typing indicators
    socket.on('typing', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('user_typing', {
        userId: socket.user._id,
        name: socket.user.name,
        roomId,
      });
    });

    socket.on('stop_typing', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('user_stop_typing', {
        userId: socket.user._id,
        name: socket.user.name,
        roomId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

module.exports = { initSocketIO };
