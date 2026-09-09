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
      .populate('senderId', 'name avatar email')
      .populate({
        path: 'replyTo',
        select: 'content text senderId media type',
        populate: { path: 'senderId', select: 'name' },
      });

    const total = await Message.countDocuments({ roomId });

    // Fetch all pinned messages for the room regardless of pagination
    const pinnedMessages = await Message.find({ roomId, isPinned: true })
      .sort({ pinnedAt: -1, createdAt: -1 })
      .populate('senderId', 'name avatar email')
      .populate({
        path: 'replyTo',
        select: 'content text senderId media type',
        populate: { path: 'senderId', select: 'name' },
      });

    return sendSuccess(res, 'Messages fetched successfully', {
      messages: messages.reverse(), // Chronological order for UI
      pinnedMessages,
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
    const { content, text, media, mediaUrl, type, messageType, replyTo, metadata } = req.body;

    const messageContent = (content || text || '').trim();
    const mediaObj = media || (mediaUrl ? { url: mediaUrl, type: 'image' } : null);

    if (!messageContent && (!mediaObj || !mediaObj.url)) {
      return sendError(res, 'Message text or media is required', 400);
    }

    const resolvedType = type || messageType || (mediaObj && mediaObj.url ? 'image' : 'text');

    const message = await Message.create({
      roomId,
      senderId: req.user._id,
      content: messageContent,
      text: messageContent,
      type: resolvedType,
      messageType: resolvedType,
      media: mediaObj || { url: '', type: 'image', width: 0, height: 0 },
      mediaUrl: mediaObj?.url || '',
      replyTo: replyTo || null,
      metadata: (metadata && Object.keys(metadata).length > 0) ? metadata : null,
    });

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name avatar email')
      .populate({
        path: 'replyTo',
        select: 'content text senderId media type',
        populate: { path: 'senderId', select: 'name' },
      });

    // Broadcast via Socket.IO if available on app
    const io = req.app.get('io') || req.io;
    if (io) {
      io.to(`room:${roomId}`).emit('new_message', populated);
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
      body: messageContent || (resolvedType === 'image' ? 'Sent a photo 📸' : 'Sent a message'),
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

// @desc    Toggle Emoji Reaction on a Message
// @route   POST /api/rooms/:roomId/messages/:messageId/reactions
// @access  Private (Room member)
const toggleReaction = async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return sendError(res, 'Emoji is required', 400);
    }

    const message = await Message.findOne({ _id: messageId, roomId });
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    const userIdStr = req.user._id.toString();
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userIdStr && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Remove reaction
      message.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({
        userId: req.user._id,
        emoji,
      });
    }

    await message.save();

    const io = req.app.get('io') || req.io;
    if (io) {
      io.to(`room:${roomId}`).emit('message_reaction_updated', {
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    return sendSuccess(res, 'Reaction updated', {
      messageId: message._id,
      reactions: message.reactions,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete a message (Author, Owner, or Admin)
// @route   DELETE /api/rooms/:roomId/messages/:messageId
// @access  Private (Message author, Room Owner, or Room Admin)
const deleteMessage = async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, roomId });
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    const isAuthor = message.senderId.toString() === req.user._id.toString();
    const isOwner = req.roomMember?.role === 'owner';
    const isAdmin = req.roomMember?.role === 'admin';

    if (!isAuthor && !isOwner && !isAdmin) {
      return sendError(res, 'Access denied: You do not have permission to delete this message', 403);
    }

    await Message.findByIdAndDelete(messageId);

    const io = req.app.get('io') || req.io;
    if (io) {
      io.to(`room:${roomId}`).emit('message_deleted', {
        messageId,
        roomId,
      });
    }

    return sendSuccess(res, 'Message deleted successfully', { messageId });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Toggle Pin status of a message
// @route   POST /api/rooms/:roomId/messages/:messageId/pin
// @access  Private (Room member)
const togglePinMessage = async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, roomId })
      .populate('senderId', 'name avatar email');
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? req.user._id : null;
    message.pinnedAt = message.isPinned ? new Date() : null;
    await message.save();

    const io = req.app.get('io') || req.io;
    if (io) {
      io.to(`room:${roomId}`).emit('message_pinned_updated', {
        messageId: message._id,
        isPinned: message.isPinned,
        message,
      });
    }

    return sendSuccess(res, `Message ${message.isPinned ? 'pinned' : 'unpinned'} successfully`, {
      messageId: message._id,
      isPinned: message.isPinned,
      message,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  toggleReaction,
  deleteMessage,
  togglePinMessage,
};
