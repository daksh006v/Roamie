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

    // 1. Join Room Channel with database authorization check
    socket.on('join_room', async ({ roomId }, callback) => {
      try {
        if (!roomId) {
          if (callback) callback({ success: false, error: 'Room ID is required' });
          return;
        }

        // Strictly verify user is a registered member of this room
        const membership = await RoomMember.findOne({
          roomId,
          userId: socket.user._id,
        });

        if (!membership) {
          console.warn(`⛔ Unauthorized socket join attempt by ${socket.user.name} for room ${roomId}`);
          if (callback) callback({ success: false, error: 'Not authorized: You are not a member of this room' });
          return;
        }

        const roomChannel = `room:${roomId}`;
        socket.join(roomChannel);
        console.log(`👤 ${socket.user.name} (${membership.role}) joined socket room: ${roomChannel}`);

        if (callback) {
          callback({ success: true, room: roomChannel, role: membership.role });
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
    socket.on('send_message', async (data, callback) => {
      try {
        const { roomId, content, text, media, mediaUrl, type, messageType, replyTo, metadata } = data || {};
        const messageContent = (content || text || '').trim();
        const mediaObj = media || (mediaUrl ? { url: mediaUrl, type: 'image' } : null);

        if (!roomId || (!messageContent && (!mediaObj || !mediaObj.url))) {
          if (callback) callback({ success: false, error: 'Message content or media is required' });
          return;
        }

        // Strictly verify membership in DB before processing
        const membership = await RoomMember.findOne({
          roomId,
          userId: socket.user._id,
        });

        if (!membership) {
          if (callback) callback({ success: false, error: 'Not authorized: You are not a member of this room' });
          return;
        }

        const resolvedType = type || messageType || (mediaObj && mediaObj.url ? 'image' : 'text');

        const message = await Message.create({
          roomId,
          senderId: socket.user._id,
          content: messageContent,
          text: messageContent,
          type: resolvedType,
          messageType: resolvedType,
          media: mediaObj || { url: '', type: 'image', width: 0, height: 0 },
          mediaUrl: mediaObj?.url || '',
          replyTo: replyTo || null,
          metadata: (metadata && Object.keys(metadata).length > 0) ? metadata : null,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name avatar email')
          .populate({
            path: 'replyTo',
            select: 'content text senderId media type',
            populate: { path: 'senderId', select: 'name' },
          });

        // Broadcast to all sockets in room
        io.to(`room:${roomId}`).emit('new_message', populatedMessage);

        if (callback) {
          callback({ success: true, message: populatedMessage });
        }
      } catch (error) {
        console.error('Socket send_message error:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 4. Toggle Emoji Reaction via Socket
    socket.on('add_reaction', async ({ roomId, messageId, emoji }, callback) => {
      try {
        if (!roomId || !messageId || !emoji) {
          if (callback) callback({ success: false, error: 'roomId, messageId, and emoji required' });
          return;
        }

        // Verify membership
        const membership = await RoomMember.findOne({ roomId, userId: socket.user._id });
        if (!membership) {
          if (callback) callback({ success: false, error: 'Not authorized' });
          return;
        }

        const message = await Message.findOne({ _id: messageId, roomId });
        if (!message) {
          if (callback) callback({ success: false, error: 'Message not found' });
          return;
        }

        const userIdStr = socket.user._id.toString();
        const existingIdx = message.reactions.findIndex(
          (r) => r.userId.toString() === userIdStr && r.emoji === emoji
        );

        if (existingIdx > -1) {
          message.reactions.splice(existingIdx, 1);
        } else {
          message.reactions.push({ userId: socket.user._id, emoji });
        }

        await message.save();

        io.to(`room:${roomId}`).emit('message_reaction_updated', {
          messageId: message._id,
          reactions: message.reactions,
        });

        if (callback) callback({ success: true, reactions: message.reactions });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 4b. Real-time Delete Message
    socket.on('delete_message', async ({ roomId, messageId }, callback) => {
      try {
        if (!roomId || !messageId) {
          if (callback) callback({ success: false, error: 'Room ID and message ID required' });
          return;
        }

        const membership = await RoomMember.findOne({ roomId, userId: socket.user._id });
        if (!membership) {
          if (callback) callback({ success: false, error: 'Not authorized' });
          return;
        }

        const message = await Message.findOne({ _id: messageId, roomId });
        if (!message) {
          if (callback) callback({ success: false, error: 'Message not found' });
          return;
        }

        const isAuthor = message.senderId.toString() === socket.user._id.toString();
        const isOwner = membership.role === 'owner';
        const isAdmin = membership.role === 'admin';

        if (!isAuthor && !isOwner && !isAdmin) {
          if (callback) callback({ success: false, error: 'Not authorized to delete this message' });
          return;
        }

        await Message.findByIdAndDelete(messageId);

        io.to(`room:${roomId}`).emit('message_deleted', {
          messageId,
          roomId,
        });

        if (callback) callback({ success: true, messageId });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 4c. Real-time Pin Message
    socket.on('pin_message', async ({ roomId, messageId }, callback) => {
      try {
        if (!roomId || !messageId) {
          if (callback) callback({ success: false, error: 'Room ID and message ID required' });
          return;
        }

        const membership = await RoomMember.findOne({ roomId, userId: socket.user._id });
        if (!membership) {
          if (callback) callback({ success: false, error: 'Not authorized' });
          return;
        }

        const message = await Message.findOne({ _id: messageId, roomId })
          .populate('senderId', 'name avatar email');
        if (!message) {
          if (callback) callback({ success: false, error: 'Message not found' });
          return;
        }

        message.isPinned = !message.isPinned;
        message.pinnedBy = message.isPinned ? socket.user._id : null;
        message.pinnedAt = message.isPinned ? new Date() : null;
        await message.save();

        io.to(`room:${roomId}`).emit('message_pinned_updated', {
          messageId: message._id,
          isPinned: message.isPinned,
          message,
        });

        if (callback) callback({ success: true, isPinned: message.isPinned, message });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 5. Typing indicators
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
