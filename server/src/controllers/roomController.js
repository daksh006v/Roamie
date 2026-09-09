const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const Message = require('../models/Message');
const Expense = require('../models/Expense');
const Place = require('../models/Place');
const Media = require('../models/Media');
const ItineraryItem = require('../models/ItineraryItem');
const Notification = require('../models/Notification');
const { generateInviteCode } = require('../utils/generateCode');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_ROLE_COLORS,
  updateAdminPermissions,
  updateRoleColors,
  updateRoomNotifications,
  endTrip,
  toggleLockItinerary,
} = require('./roomSettingsController');

const {
  previewRoomByInviteCode,
  joinRoom,
  inviteContact,
  updateMemberRole,
  leaveRoom,
} = require('./roomMemberController');

// @desc    Create a new Room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, description, coverImage } = req.body;

    if (!name || !destination || !startDate || !endDate) {
      return sendError(res, 'Please provide name, destination, start date, and end date', 400);
    }

    if (new Date(startDate) > new Date(endDate)) {
      return sendError(res, 'Start date cannot be after end date', 400);
    }

    // Generate unique 8-character invite code (e.g., GOA26X7K)
    let inviteCode = generateInviteCode(destination);
    let codeExists = await Room.findOne({ inviteCode });
    while (codeExists) {
      inviteCode = generateInviteCode(destination);
      codeExists = await Room.findOne({ inviteCode });
    }

    const room = await Room.create({
      name: name.trim(),
      destination: destination.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description ? description.trim() : '',
      coverImage: coverImage || '',
      inviteCode,
      createdBy: req.user._id,
      status: 'planning',
    });

    // Creator is automatically the Owner
    const membership = await RoomMember.create({
      roomId: room._id,
      userId: req.user._id,
      role: 'owner',
    });

    // Create system message
    await Message.create({
      roomId: room._id,
      senderId: req.user._id,
      messageType: 'system',
      systemAction: `${req.user.name} created the trip "${room.name}"`,
    });

    return sendSuccess(
      res,
      'Room created successfully',
      {
        room,
        membership,
        inviteDetails: {
          inviteCode: room.inviteCode,
          inviteLink: `${process.env.CLIENT_URL || 'roamie://'}join?code=${room.inviteCode}`,
        },
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get all rooms for current user (categorized: active, planning, completed)
// @route   GET /api/rooms
// @access  Private
const getMyRooms = async (req, res) => {
  try {
    const memberships = await RoomMember.find({ userId: req.user._id });
    const roomIds = memberships.map((m) => m.roomId);

    const rooms = await Room.find({ _id: { $in: roomIds } })
      .sort({ startDate: 1 })
      .populate('createdBy', 'name avatar');

    const memberMap = {};
    memberships.forEach((m) => {
      memberMap[m.roomId.toString()] = m.role;
    });

    const now = new Date();
    const active = [];
    const planning = [];
    const completed = [];

    rooms.forEach((room) => {
      const start = new Date(room.startDate);
      const end = new Date(room.endDate);
      const roomObj = room.toObject();
      roomObj.userRole = memberMap[room._id.toString()] || 'member';

      if (room.status === 'completed' || now > end) {
        completed.push(roomObj);
      } else if (now >= start && now <= end) {
        active.push(roomObj);
      } else {
        planning.push(roomObj);
      }
    });

    return sendSuccess(res, 'Rooms fetched successfully', {
      total: rooms.length,
      active,
      planning,
      completed,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get Room Details + Dynamic Stats (About Tab)
// @route   GET /api/rooms/:id
// @access  Private (Room Member only)
const getRoomById = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId).populate('createdBy', 'name email avatar');

    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const members = await RoomMember.find({ roomId }).populate('userId', 'name email avatar phone');
    const messageCount = await Message.countDocuments({ roomId });
    const photoCount = await Media.countDocuments({ roomId });
    const placeCount = await Place.countDocuments({ roomId });
    const itineraryCount = await ItineraryItem.countDocuments({ roomId });
    const expenses = await Expense.find({ roomId });
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Days calculations
    const now = new Date();
    const start = new Date(room.startDate);
    const end = new Date(room.endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    let currentDay = 0;
    let progressPercentage = 0;

    if (now < start) {
      currentDay = 0;
      progressPercentage = 0;
    } else if (now >= start && now <= end) {
      currentDay = Math.min(totalDays, Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1);
      progressPercentage = Math.round((currentDay / totalDays) * 100);
    } else {
      currentDay = totalDays;
      progressPercentage = 100;
    }

    // Ensure adminPermissions and roleColors exist with migration fallback
    const roomObj = room.toObject();
    roomObj.adminPermissions = {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...(roomObj.adminPermissions || {}),
    };
    roomObj.roleColors = {
      ...DEFAULT_ROLE_COLORS,
      ...(roomObj.roleColors || {}),
    };

    const memberObj = req.roomMember ? req.roomMember.toObject() : {};
    if (!memberObj.notifications) {
      memberObj.notifications = {
        muted: false,
        chat: true,
        expenses: true,
        itinerary: true,
        gallery: true,
      };
    }

    return sendSuccess(res, 'Room details fetched', {
      room: roomObj,
      membership: memberObj,
      members,
      inviteDetails: {
        inviteCode: room.inviteCode,
        inviteLink: `${process.env.CLIENT_URL || 'roamie://'}join?code=${room.inviteCode}`,
      },
      stats: {
        totalDays,
        currentDay,
        progressPercentage,
        isUnderway: now >= start && now <= end,
        isCompleted: now > end || room.status === 'completed',
        totalSpent,
        messageCount,
        photoCount,
        placeCount,
        itineraryCount,
        memberCount: members.length,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Room Details (Owner or Admin with editRoom permission)
// @route   PUT /api/rooms/:id
// @access  Private (Owner or Admin with editRoom)
const updateRoom = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, description, coverImage } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId: room._id, userId: req.user._id }));
    if (!callerMembership) {
      return sendError(res, 'Access denied: You are not a member of this room', 403);
    }

    const isOwner = callerMembership.role === 'owner';
    const isAdmin = callerMembership.role === 'admin';
    const adminCanEdit = room.adminPermissions?.editRoom ?? true;

    if (!isOwner && !(isAdmin && adminCanEdit)) {
      return sendError(res, 'Access denied: You do not have permission to edit room details', 403);
    }

    if (name) room.name = name.trim();
    if (destination) room.destination = destination.trim();
    if (startDate) room.startDate = new Date(startDate);
    if (endDate) room.endDate = new Date(endDate);
    if (description !== undefined) room.description = description.trim();
    if (coverImage !== undefined) room.coverImage = coverImage;

    await room.save();

    return sendSuccess(res, 'Room details updated successfully', { room });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete Room & Cascade Data (Owner only)
// @route   DELETE /api/rooms/:id
// @access  Private (Owner only)
const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId);

    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership || callerMembership.role !== 'owner') {
      return sendError(res, 'Access denied: Only the room Owner can delete this room', 403);
    }

    await Room.findByIdAndDelete(roomId);
    await RoomMember.deleteMany({ roomId });
    await Message.deleteMany({ roomId });
    await Expense.deleteMany({ roomId });
    await Place.deleteMany({ roomId });
    await Media.deleteMany({ roomId });
    await ItineraryItem.deleteMany({ roomId });
    await Notification.deleteMany({ roomId });

    return sendSuccess(res, 'Room and all associated trip data deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  createRoom,
  getMyRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  previewRoomByInviteCode,
  joinRoom,
  inviteContact,
  updateMemberRole,
  leaveRoom,
  updateAdminPermissions,
  updateRoleColors,
  updateRoomNotifications,
  endTrip,
  toggleLockItinerary,
};
