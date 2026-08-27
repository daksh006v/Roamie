const Message = require('../models/Message');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendPushNotifications } = require('../services/pushNotificationService');

// @desc    Get messages for a room (paginated / scrollback)
// @route   GET /api/rooms/:roomId/messages
// @access  Private (Room member)
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar email');

    const total = await Message.countDocuments({ roomId });

    return sendSuccess(res, 'Messages fetched', {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Send a message in a room
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
      text: text || '',
      mediaUrl: mediaUrl || '',
      messageType: messageType || (mediaUrl ? 'image' : 'text'),
    });

    const populated = await Message.findById(message._id).populate('senderId', 'name avatar email');

    // Notify other room members via push
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
        roomId,
        messageId: message._id.toString(),
      },
    }));

    if (pushMessages.length > 0) {
      sendPushNotifications(pushMessages).catch((err) =>
        console.error('Push error:', err)
      );
    }

    return sendSuccess(res, 'Message sent', { message: populated }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getMessages,
  sendMessage,
};
