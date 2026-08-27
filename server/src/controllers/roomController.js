const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const Message = require('../models/Message');
const Expense = require('../models/Expense');
const Place = require('../models/Place');
const Media = require('../models/Media');
const ItineraryItem = require('../models/ItineraryItem');
const { generateInviteCode } = require('../utils/generateCode');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Create a new Room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, description, coverImage } = req.body;

    if (!name || !destination || !startDate || !endDate) {
      return sendError(res, 'Please provide name, destination, start date, and end date', 400);
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode(destination);
    let codeExists = await Room.findOne({ inviteCode });
    while (codeExists) {
      inviteCode = generateInviteCode(destination);
      codeExists = await Room.findOne({ inviteCode });
    }

    const room = await Room.create({
      name,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description || '',
      coverImage: coverImage || '',
      inviteCode,
      createdBy: req.user._id,
      status: 'planning',
    });

    // Creator is automatically the Owner
    await RoomMember.create({
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

    return sendSuccess(res, 'Room created successfully', { room }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get all rooms for current user (grouped by status)
// @route   GET /api/rooms
// @access  Private
const getMyRooms = async (req, res) => {
  try {
    const memberships = await RoomMember.find({ userId: req.user._id });
    const roomIds = memberships.map((m) => m.roomId);

    const rooms = await Room.find({ _id: { $in: roomIds } })
      .sort({ startDate: -1 })
      .populate('createdBy', 'name avatar');

    // Group rooms according to PRD: Active, Planning, Completed (Archived)
    const now = new Date();
    const active = [];
    const planning = [];
    const completed = [];

    rooms.forEach((room) => {
      const start = new Date(room.startDate);
      const end = new Date(room.endDate);

      if (room.status === 'completed' || now > end) {
        completed.push(room);
      } else if (now >= start && now <= end) {
        active.push(room);
      } else {
        planning.push(room);
      }
    });

    return sendSuccess(res, 'Rooms fetched successfully', {
      all: rooms,
      active,
      planning,
      completed,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get Room Details + Live Dashboard Stats (About Tab)
// @route   GET /api/rooms/:id
// @access  Private (Member only)
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

    // Calculate days elapsed / total
    const now = new Date();
    const start = new Date(room.startDate);
    const end = new Date(room.endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    
    let currentDay = 0;
    if (now >= start && now <= end) {
      currentDay = Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (now > end) {
      currentDay = totalDays;
    }

    return sendSuccess(res, 'Room details fetched', {
      room,
      membership: req.roomMember,
      members,
      stats: {
        totalDays,
        currentDay,
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

// @desc    Join Room via Invite Code
// @route   POST /api/rooms/join
// @access  Private
const joinRoom = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return sendError(res, 'Please provide an invite code', 400);
    }

    const room = await Room.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!room) {
      return sendError(res, 'Invalid or expired invite code', 404);
    }

    const existingMember = await RoomMember.findOne({
      roomId: room._id,
      userId: req.user._id,
    });

    if (existingMember) {
      return sendSuccess(res, 'Already a member of this room', { room, member: existingMember });
    }

    const member = await RoomMember.create({
      roomId: room._id,
      userId: req.user._id,
      role: 'member',
    });

    // Post system message
    await Message.create({
      roomId: room._id,
      senderId: req.user._id,
      messageType: 'system',
      systemAction: `${req.user.name} joined the trip via invite code`,
    });

    return sendSuccess(res, 'Joined room successfully', { room, member }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Room (Owner only)
// @route   PUT /api/rooms/:id
// @access  Private (Owner only)
const updateRoom = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, description, coverImage, status, isItineraryLocked } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    if (name) room.name = name;
    if (destination) room.destination = destination;
    if (startDate) room.startDate = new Date(startDate);
    if (endDate) room.endDate = new Date(endDate);
    if (description !== undefined) room.description = description;
    if (coverImage !== undefined) room.coverImage = coverImage;
    if (status) room.status = status;
    if (isItineraryLocked !== undefined) room.isItineraryLocked = isItineraryLocked;

    await room.save();

    return sendSuccess(res, 'Room updated successfully', { room });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Leave Room (Member)
// @route   POST /api/rooms/:id/leave
// @access  Private
const leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const member = await RoomMember.findOne({ roomId, userId: req.user._id });

    if (!member) {
      return sendError(res, 'You are not a member of this room', 400);
    }

    if (member.role === 'owner') {
      return sendError(res, 'Room owner cannot leave the room. Transfer ownership or delete room instead.', 400);
    }

    await RoomMember.findByIdAndDelete(member._id);

    await Message.create({
      roomId,
      senderId: req.user._id,
      messageType: 'system',
      systemAction: `${req.user.name} left the trip`,
    });

    return sendSuccess(res, 'Left room successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete Room (Owner only)
// @route   DELETE /api/rooms/:id
// @access  Private (Owner only)
const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    await Room.findByIdAndDelete(roomId);
    await RoomMember.deleteMany({ roomId });
    await Message.deleteMany({ roomId });
    await Expense.deleteMany({ roomId });
    await Place.deleteMany({ roomId });
    await Media.deleteMany({ roomId });
    await ItineraryItem.deleteMany({ roomId });

    return sendSuccess(res, 'Room and all associated data deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  createRoom,
  getMyRooms,
  getRoomById,
  joinRoom,
  updateRoom,
  leaveRoom,
  deleteRoom,
};
