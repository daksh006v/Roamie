const Message = require('../models/Message');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendPushNotifications } = require('../services/pushNotificationService');

// @desc    Get paginated message history for a room
// @route   GET /api/rooms/:roomId/messages
// @access  Private (Room member)
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const before = req.query.before; // Optional timestamp cursor

    const query = { roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar email');

    const total = await Message.countDocuments({ roomId });

    return sendSuccess(res, 'Messages fetched successfully', {
      messages: messages.reverse(), // Chronological order for UI
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Send a message in a room (REST endpoint)
// @route   POST /api/rooms/:roomId/messages
// @access  Private (Room member)
const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text, mediaUrl, messageType } = req.body;

    if (!text && !mediaUrl) {
      return sendError(res, 'Message text or media is required', 400);
    }

    const message = await Message.create({
      roomId,
      senderId: req.user._id,
      text: text ? text.trim() : '',
      mediaUrl: mediaUrl || '',
      messageType: messageType || (mediaUrl ? 'image' : 'text'),
    });

    const populated = await Message.findById(message._id).populate('senderId', 'name avatar email');

    // Broadcast via Socket.IO if available on app
    if (req.io) {
      req.io.to(`room:${roomId}`).emit('new_message', populated);
    }

    // Push notifications to other members
    const otherMembers = await RoomMember.find({
      roomId,
      userId: { $ne: req.user._id },
    });
    const userIds = otherMembers.map((m) => m.userId);
    const usersToNotify = await User.find({ _id: { $in: userIds }, pushToken: { $ne: '' } });

    const pushMessages = usersToNotify.map((u) => ({
      to: u.pushToken,
      sound: 'default',
      title: req.user.name,
      body: text || 'Sent a photo',
      data: {
        type: 'message',
        roomId: roomId.toString(),
        messageId: message._id.toString(),
      },
    }));

    if (pushMessages.length > 0) {
      sendPushNotifications(pushMessages).catch((err) =>
        console.error('Push error:', err)
      );
    }

    return sendSuccess(res, 'Message sent successfully', { message: populated }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getMessages,
  sendMessage,
};
