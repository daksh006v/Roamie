const ItineraryItem = require('../models/ItineraryItem');
const Room = require('../models/Room');
const Place = require('../models/Place');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const { sendPushNotifications } = require('../services/pushNotificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Add an activity to the shared room itinerary
// @route   POST /api/rooms/:roomId/itinerary
// @access  Private (Room Member)
const addItineraryItem = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      title,
      date,
      startTime,
      endTime,
      description,
      placeId,
      reminderMinutesBefore,
    } = req.body;

    if (!title || !date) {
      return sendError(res, 'Please provide activity title and date', 400);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    // Check if room itinerary is locked by Owner
    if (room.isItineraryLocked && req.roomMember.role !== 'owner') {
      return sendError(res, 'Itinerary has been locked by the trip Owner', 403);
    }

    // Validate place link if provided
    if (placeId) {
      const place = await Place.findOne({ _id: placeId, roomId });
      if (!place) {
        return sendError(res, 'Linked place does not exist in this room', 400);
      }
    }

    const item = await ItineraryItem.create({
      roomId,
      title: title.trim(),
      date: new Date(date),
      startTime: startTime ? startTime.trim() : '',
      endTime: endTime ? endTime.trim() : '',
      description: description ? description.trim() : '',
      placeId: placeId || null,
      reminderMinutesBefore: reminderMinutesBefore !== undefined ? Number(reminderMinutesBefore) : null,
      createdBy: req.user._id,
    });

    const populatedItem = await ItineraryItem.findById(item._id)
      .populate('placeId')
      .populate('createdBy', 'name email avatar');

    // Broadcast real-time update to all room members via Socket.IO
    if (req.io) {
      req.io.to(`room:${roomId}`).emit('new_itinerary_item', {
        item: populatedItem,
        addedBy: req.user.name,
      });
    }

    // Push notifications to other travelers in room
    const otherMembers = await RoomMember.find({
      roomId,
      userId: { $ne: req.user._id },
    });
    const userIds = otherMembers.map((m) => m.userId);
    const usersToNotify = await User.find({ _id: { $in: userIds }, pushToken: { $ne: '' } });

    const pushMessages = usersToNotify.map((u) => ({
      to: u.pushToken,
      sound: 'default',
      title: 'Itinerary Updated 🗓️',
      body: `${req.user.name} added "${item.title}" to the trip schedule`,
      data: {
        type: 'itinerary_item_added',
        roomId: roomId.toString(),
        itemId: item._id.toString(),
      },
    }));

    if (pushMessages.length > 0) {
      sendPushNotifications(pushMessages).catch((err) =>
        console.error('Itinerary push error:', err)
      );
    }

    return sendSuccess(res, 'Activity added to itinerary successfully', { item: populatedItem }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get shared itinerary grouped chronologically by day
// @route   GET /api/rooms/:roomId/itinerary
// @access  Private (Room Member)
const getItinerary = async (req, res) => {
  try {
    const { roomId } = req.params;

    const items = await ItineraryItem.find({ roomId })
      .sort({ date: 1, startTime: 1 })
      .populate('placeId')
      .populate('createdBy', 'name email avatar');

    // Group items by calendar date string (YYYY-MM-DD)
    const groupedDays = {};

    items.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      if (!groupedDays[dateKey]) {
        groupedDays[dateKey] = {
          date: dateKey,
          formattedDate: new Date(item.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          activities: [],
        };
      }
      groupedDays[dateKey].activities.push(item);
    });

    const days = Object.values(groupedDays);

    return sendSuccess(res, 'Itinerary fetched successfully', {
      totalActivities: items.length,
      totalDays: days.length,
      days,
      rawItems: items,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update an itinerary activity / toggle complete
// @route   PUT /api/rooms/:roomId/itinerary/:itemId
// @access  Private (Room Member)
const updateItineraryItem = async (req, res) => {
  try {
    const { roomId, itemId } = req.params;
    const {
      title,
      date,
      startTime,
      endTime,
      description,
      placeId,
      isCompleted,
      reminderMinutesBefore,
    } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    // Check if room itinerary is locked by Owner
    if (room.isItineraryLocked && req.roomMember.role !== 'owner') {
      return sendError(res, 'Itinerary has been locked by the trip Owner', 403);
    }

    const item = await ItineraryItem.findOne({ _id: itemId, roomId });
    if (!item) {
      return sendError(res, 'Activity not found', 404);
    }

    if (title) item.title = title.trim();
    if (date) item.date = new Date(date);
    if (startTime !== undefined) item.startTime = startTime.trim();
    if (endTime !== undefined) item.endTime = endTime.trim();
    if (description !== undefined) item.description = description.trim();
    if (placeId !== undefined) item.placeId = placeId || null;
    if (isCompleted !== undefined) item.isCompleted = Boolean(isCompleted);
    if (reminderMinutesBefore !== undefined) {
      item.reminderMinutesBefore = reminderMinutesBefore !== null ? Number(reminderMinutesBefore) : null;
      item.reminderSent = false; // Reset if reminder timing changed
    }

    await item.save();

    const populatedItem = await ItineraryItem.findById(item._id)
      .populate('placeId')
      .populate('createdBy', 'name email avatar');

    if (req.io) {
      req.io.to(`room:${roomId}`).emit('updated_itinerary_item', populatedItem);
    }

    return sendSuccess(res, 'Activity updated successfully', { item: populatedItem });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete an itinerary activity
// @route   DELETE /api/rooms/:roomId/itinerary/:itemId
// @access  Private (Room Member)
const deleteItineraryItem = async (req, res) => {
  try {
    const { roomId, itemId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    if (room.isItineraryLocked && req.roomMember.role !== 'owner') {
      return sendError(res, 'Itinerary has been locked by the trip Owner', 403);
    }

    const item = await ItineraryItem.findOneAndDelete({ _id: itemId, roomId });
    if (!item) {
      return sendError(res, 'Activity not found', 404);
    }

    if (req.io) {
      req.io.to(`room:${roomId}`).emit('deleted_itinerary_item', { itemId });
    }

    return sendSuccess(res, 'Activity removed from itinerary');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  addItineraryItem,
  getItinerary,
  updateItineraryItem,
  deleteItineraryItem,
};
