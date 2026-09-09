const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const Message = require('../models/Message');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const DEFAULT_ADMIN_PERMISSIONS = {
  editRoom: true,
  manageMembers: true,
  manageItinerary: true,
  lockItinerary: true,
  manageExpenses: true,
  managePhotos: true,
  managePlaces: true,
  endTrip: true,
};

const DEFAULT_ROLE_COLORS = {
  owner: '#C96A25',
  admin: '#5F745F',
  member: '#59615A',
};

// @desc    Update Admin Permissions (Owner only)
// @route   PATCH /api/rooms/:id/admin-permissions
// @access  Private (Owner only)
const updateAdminPermissions = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { adminPermissions } = req.body;

    if (!adminPermissions || typeof adminPermissions !== 'object') {
      return sendError(res, 'adminPermissions object is required', 400);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership || callerMembership.role !== 'owner') {
      return sendError(res, 'Access denied: Only the room Owner can configure Admin permissions', 403);
    }

    const current = room.adminPermissions?.toObject?.() || room.adminPermissions || DEFAULT_ADMIN_PERMISSIONS;
    room.adminPermissions = {
      ...current,
      ...adminPermissions,
    };

    await room.save();

    return sendSuccess(res, 'Admin permissions updated successfully', {
      adminPermissions: room.adminPermissions,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update Room Role Colors (Owner only)
// @route   PUT /api/rooms/:id/role-colors
// @access  Private (Owner only)
const updateRoleColors = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { roleColors } = req.body;

    if (!roleColors || typeof roleColors !== 'object') {
      return sendError(res, 'roleColors object is required', 400);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership || callerMembership.role !== 'owner') {
      return sendError(res, 'Access denied: Only the room Owner can change role colors', 403);
    }

    const current = room.roleColors?.toObject?.() || room.roleColors || DEFAULT_ROLE_COLORS;
    room.roleColors = {
      ...current,
      ...roleColors,
    };

    await room.save();

    return sendSuccess(res, 'Role colors updated successfully', {
      roleColors: room.roleColors,
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

// @desc    End Trip (Owner or Admin with endTrip permission)
// @route   POST /api/rooms/:id/end
// @access  Private (Owner or Admin with endTrip)
const endTrip = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId: room._id, userId: req.user._id }));
    if (!callerMembership) {
      return sendError(res, 'Access denied: Not a member', 403);
    }

    const isOwner = callerMembership.role === 'owner';
    const isAdmin = callerMembership.role === 'admin';
    const adminCanEnd = room.adminPermissions?.endTrip ?? true;

    if (!isOwner && !(isAdmin && adminCanEnd)) {
      return sendError(res, 'Access denied: You do not have permission to end this trip', 403);
    }

    room.status = 'completed';
    await room.save();

    const actionText = `${req.user.name} marked the trip as completed! 🏁`;
    await Message.create({
      roomId: room._id,
      senderId: req.user._id,
      type: 'system',
      messageType: 'system',
      content: actionText,
      systemAction: actionText,
    });

    return sendSuccess(res, 'Trip marked as completed', { room });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Lock or Unlock Itinerary (Owner or Admin with lockItinerary permission)
// @route   POST /api/rooms/:id/itinerary/lock
// @access  Private (Owner or Admin with lockItinerary)
const toggleLockItinerary = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendError(res, 'Room not found', 404);
    }

    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId: room._id, userId: req.user._id }));
    if (!callerMembership) {
      return sendError(res, 'Access denied: Not a member', 403);
    }

    const isOwner = callerMembership.role === 'owner';
    const isAdmin = callerMembership.role === 'admin';
    const adminCanLock = room.adminPermissions?.lockItinerary ?? true;

    if (!isOwner && !(isAdmin && adminCanLock)) {
      return sendError(res, 'Access denied: You do not have permission to lock or unlock the itinerary', 403);
    }

    const isLocked = req.body.isItineraryLocked !== undefined ? req.body.isItineraryLocked : !room.isItineraryLocked;
    room.isItineraryLocked = isLocked;
    await room.save();

    const actionText = isLocked
      ? `${req.user.name} locked the itinerary 🔒`
      : `${req.user.name} unlocked the itinerary 🔓`;

    await Message.create({
      roomId: room._id,
      senderId: req.user._id,
      type: 'system',
      messageType: 'system',
      content: actionText,
      systemAction: actionText,
    });

    return sendSuccess(res, `Itinerary ${isLocked ? 'locked' : 'unlocked'} successfully`, {
      isItineraryLocked: room.isItineraryLocked,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_ROLE_COLORS,
  updateAdminPermissions,
  updateRoleColors,
  updateRoomNotifications,
  endTrip,
  toggleLockItinerary,
};
