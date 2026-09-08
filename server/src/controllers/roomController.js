const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const Message = require('../models/Message');
const Expense = require('../models/Expense');
const Place = require('../models/Place');
const Media = require('../models/Media');
const ItineraryItem = require('../models/ItineraryItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateInviteCode } = require('../utils/generateCode');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendUserNotification } = require('../services/pushNotificationService');

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

    // Ensure permissions object exists
    const roomObj = room.toObject();
    if (!roomObj.permissions) {
      roomObj.permissions = {
        members: {
          canAddItinerary: true,
          canAddExpenses: true,
          canUploadMedia: true,
          canAddPlaces: true,
          canInvite: true,
        },
        admins: {
          canEditTripInfo: true,
          canManageRoles: true,
          canEndTrip: true,
          canDeleteRoom: false,
        },
      };
    }

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

// @desc    Preview Room Info using Invite Code (Public/Auth for invite link preview)
// @route   GET /api/rooms/invite/:inviteCode
// @access  Private
const previewRoomByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const room = await Room.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
    }).populate('createdBy', 'name avatar');

    if (!room) {
      return sendError(res, 'Invalid or expired invite link / code', 404);
    }

    const memberCount = await RoomMember.countDocuments({ roomId: room._id });
    const isAlreadyMember = await RoomMember.exists({
      roomId: room._id,
      userId: req.user._id,
    });

    return sendSuccess(res, 'Invite preview fetched', {
      room: {
        _id: room._id,
        name: room.name,
        destination: room.destination,
        startDate: room.startDate,
        endDate: room.endDate,
        description: room.description,
        coverImage: room.coverImage,
        inviteCode: room.inviteCode,
        createdBy: room.createdBy,
      },
      memberCount,
      isAlreadyMember: Boolean(isAlreadyMember),
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

    // Post system message in room chat
    await Message.create({
      roomId: room._id,
      senderId: req.user._id,
      messageType: 'system',
      systemAction: `${req.user.name} joined the room`,
    });

    // Notify room owner of new member
    const ownerMember = await RoomMember.findOne({ roomId: room._id, role: 'owner' }).populate('userId');
    if (ownerMember && ownerMember.userId && ownerMember.userId._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipientId: ownerMember.userId._id,
        senderId: req.user._id,
        roomId: room._id,
        type: 'member_joined',
        title: 'New traveler joined!',
        body: `${req.user.name} joined "${room.name}"`,
        data: { roomId: room._id },
      });

      if (ownerMember.userId.pushToken) {
        sendUserNotification(
          ownerMember.userId.pushToken,
          'New traveler joined!',
          `${req.user.name} joined "${room.name}"`,
          { roomId: room._id.toString(), type: 'member_joined' }
        ).catch((err) => console.error('Push error:', err));
      }
    }

    return sendSuccess(res, `Joined "${room.name}" successfully`, { room, member }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Invite by Contact (Phone / Email / Search)
// @route   POST /api/rooms/:id/invite
// @access  Private (Room Member only)
const inviteContact = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { email, phone, name } = req.body;

    if (!email && !phone) {
      return sendError(res, 'Please provide an email or phone number to invite', 400);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    // Check if user is registered in Roamie
    const query = [];
    if (email) query.push({ email: email.toLowerCase().trim() });
    if (phone) query.push({ phone: phone.trim() });

    const registeredUser = await User.findOne({ $or: query });

    let isRegistered = false;
    if (registeredUser) {
      isRegistered = true;

      // Check if already in room
      const alreadyMember = await RoomMember.findOne({ roomId, userId: registeredUser._id });
      if (alreadyMember) {
        return sendError(res, `${registeredUser.name} is already a member of this room`, 400);
      }

      // Send in-app invitation notification
      await Notification.create({
        recipientId: registeredUser._id,
        senderId: req.user._id,
        roomId: room._id,
        type: 'invite',
        title: `Trip Invitation: ${room.name}`,
        body: `${req.user.name} invited you to join the trip "${room.name}" to ${room.destination}`,
        data: { roomId: room._id, inviteCode: room.inviteCode },
      });

      // Send push notification if token available
      if (registeredUser.pushToken) {
        sendUserNotification(
          registeredUser.pushToken,
          `Trip Invitation: ${room.name}`,
          `${req.user.name} invited you to join "${room.name}"`,
          { roomId: room._id.toString(), inviteCode: room.inviteCode, type: 'invite' }
        ).catch((err) => console.error('Push error:', err));
      }
    }

    const inviteLink = `${process.env.CLIENT_URL || 'roamie://'}join?code=${room.inviteCode}`;
    const shareMessage = `Hey${name ? ' ' + name : ''}! Join my trip "${room.name}" to ${room.destination} on Roamie! Use invite code ${room.inviteCode} or open: ${inviteLink}`;

    return sendSuccess(res, isRegistered ? 'Invitation notification sent!' : 'Invite payload prepared for contact', {
      isRegistered,
      recipient: registeredUser ? { name: registeredUser.name, email: registeredUser.email } : { email, phone, name },
      inviteCode: room.inviteCode,
      inviteLink,
      shareMessage,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Member Role (Owner or Admin with permission)
// @route   PUT /api/rooms/:id/members/:memberId/role
// @access  Private
const updateMemberRole = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { memberId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return sendError(res, 'Role must be either "admin" or "member"', 400);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    // Check caller's role in this room
    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership) {
      return sendError(res, 'Access denied', 403);
    }

    const isOwner = callerMembership.role === 'owner';
    const isAdmin = callerMembership.role === 'admin';
    const adminCanManage = room.permissions?.admins?.canManageRoles ?? true;

    if (!isOwner && !(isAdmin && adminCanManage)) {
      return sendError(res, 'Access denied: Only trip Owner or authorized Admins can manage roles', 403);
    }

    // Find target member
    const targetMember = await RoomMember.findOne({
      _id: memberId,
      roomId,
    }).populate('userId', 'name email avatar');

    if (!targetMember) {
      return sendError(res, 'Target member not found in this room', 404);
    }

    // Cannot change owner's role
    if (targetMember.role === 'owner') {
      return sendError(res, 'The room Owner role cannot be modified', 400);
    }

    // Admins cannot demote other admins; only owner can demote admins
    if (!isOwner && targetMember.role === 'admin' && role === 'member') {
      return sendError(res, 'Only the room Owner can demote an Admin', 403);
    }

    targetMember.role = role;
    await targetMember.save();

    // Create system message in chat
    const actionText =
      role === 'admin'
        ? `${req.user.name} promoted ${targetMember.userId?.name || 'a member'} to Admin 🛡️`
        : `${req.user.name} set ${targetMember.userId?.name || 'a member'}'s role to Member 👤`;

    await Message.create({
      roomId,
      senderId: req.user._id,
      messageType: 'system',
      systemAction: actionText,
    });

    return sendSuccess(res, `Role updated to ${role} successfully`, {
      member: targetMember,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Room Role Permissions (Owner only)
// @route   PUT /api/rooms/:id/permissions
// @access  Private (Owner only)
const updateRoomPermissions = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { permissions } = req.body;

    if (!permissions) {
      return sendError(res, 'Permissions object is required', 400);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership || callerMembership.role !== 'owner') {
      return sendError(res, 'Access denied: Only the room Owner can configure role permissions', 403);
    }

    // Merge new permissions
    room.permissions = {
      members: {
        ...(room.permissions?.members?.toObject?.() || room.permissions?.members || {}),
        ...(permissions.members || {}),
      },
      admins: {
        ...(room.permissions?.admins?.toObject?.() || room.permissions?.admins || {}),
        ...(permissions.admins || {}),
      },
    };

    await room.save();

    return sendSuccess(res, 'Role permissions updated successfully', {
      permissions: room.permissions,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Member's Room Notification Settings
// @route   PUT /api/rooms/:id/notifications
// @access  Private (Room Member only)
const updateRoomNotifications = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { notifications } = req.body;

    if (!notifications || typeof notifications !== 'object') {
      return sendError(res, 'Notifications settings object is required', 400);
    }

    const member = await RoomMember.findOne({ roomId, userId: req.user._id });
    if (!member) {
      return sendError(res, 'Membership not found for this room', 404);
    }

    member.notifications = {
      muted: notifications.muted !== undefined ? !!notifications.muted : (member.notifications?.muted ?? false),
      chat: notifications.chat !== undefined ? !!notifications.chat : (member.notifications?.chat ?? true),
      expenses: notifications.expenses !== undefined ? !!notifications.expenses : (member.notifications?.expenses ?? true),
      itinerary: notifications.itinerary !== undefined ? !!notifications.itinerary : (member.notifications?.itinerary ?? true),
      gallery: notifications.gallery !== undefined ? !!notifications.gallery : (member.notifications?.gallery ?? true),
    };

    await member.save();

    return sendSuccess(res, 'Room notifications updated successfully', {
      notifications: member.notifications,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Room (Owner or authorized Admin)
// @route   PUT /api/rooms/:id
// @access  Private (Owner or authorized Admin)
const updateRoom = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, description, coverImage, status, isItineraryLocked } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId: room._id, userId: req.user._id }));
    if (!callerMembership) {
      return sendError(res, 'Access denied', 403);
    }

    const isOwner = callerMembership.role === 'owner';
    const isAdmin = callerMembership.role === 'admin';
    const adminCanEdit = room.permissions?.admins?.canEditTripInfo ?? true;
    const adminCanEnd = room.permissions?.admins?.canEndTrip ?? true;

    if (!isOwner) {
      if (!isAdmin) {
        return sendError(res, 'Access denied: Room Owner or Admin privileges required', 403);
      }
      if (status === 'completed' && !adminCanEnd) {
        return sendError(res, 'Access denied: Admins are not permitted to end this trip', 403);
      }
      if (!adminCanEdit && (name || destination || startDate || endDate || description || coverImage)) {
        return sendError(res, 'Access denied: Admins are not permitted to edit trip details', 403);
      }
    }

    if (name) room.name = name.trim();
    if (destination) room.destination = destination.trim();
    if (startDate) room.startDate = new Date(startDate);
    if (endDate) room.endDate = new Date(endDate);
    if (description !== undefined) room.description = description.trim();
    if (coverImage !== undefined) room.coverImage = coverImage;
    if (status) room.status = status;
    if (isItineraryLocked !== undefined) room.isItineraryLocked = isItineraryLocked;

    await room.save();

    return sendSuccess(res, 'Room updated successfully', { room });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Leave Room (Member only)
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
      systemAction: `${req.user.name} left the room`,
    });

    return sendSuccess(res, 'Left room successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete Room & Cascade Data (Owner or authorized Admin)
// @route   DELETE /api/rooms/:id
// @access  Private (Owner or authorized Admin)
const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId);

    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership) {
      return sendError(res, 'Access denied', 403);
    }

    const isOwner = callerMembership.role === 'owner';
    const isAdmin = callerMembership.role === 'admin';
    const adminCanDelete = room.permissions?.admins?.canDeleteRoom ?? false;

    if (!isOwner && !(isAdmin && adminCanDelete)) {
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
  previewRoomByInviteCode,
  joinRoom,
  inviteContact,
  updateMemberRole,
  updateRoomPermissions,
  updateRoomNotifications,
  updateRoom,
  leaveRoom,
  deleteRoom,
};
