const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const { sendError } = require('../utils/responseHandler');

/**
 * Ensures the authenticated user belongs to the requested room
 */
const requireRoomMembership = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.params.id || req.body.roomId;

    if (!roomId) {
      return sendError(res, 'Room ID is required', 400);
    }

    const member = await RoomMember.findOne({
      roomId,
      userId: req.user._id,
    });

    if (!member) {
      return sendError(res, 'Access denied: You are not a member of this Room', 403);
    }

    req.roomMember = member;
    next();
  } catch (error) {
    return sendError(res, `Room authorization failed: ${error.message}`, 500);
  }
};

/**
 * Ensures the authenticated user is the Owner of the room (Unrestricted ultimate authority)
 */
const requireRoomOwner = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.params.id || req.body.roomId;

    const member = req.roomMember || (await RoomMember.findOne({
      roomId,
      userId: req.user._id,
    }));

    if (!member || member.role !== 'owner') {
      return sendError(res, 'Access denied: Room Owner privileges required', 403);
    }

    req.roomMember = member;
    next();
  } catch (error) {
    return sendError(res, `Owner verification failed: ${error.message}`, 500);
  }
};

/**
 * Ensures the authenticated user is an Admin or Owner of the room
 */
const requireRoomAdminOrOwner = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.params.id || req.body.roomId;

    const member = req.roomMember || (await RoomMember.findOne({
      roomId,
      userId: req.user._id,
    }));

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return sendError(res, 'Access denied: Admin or Owner privileges required', 403);
    }

    req.roomMember = member;
    next();
  } catch (error) {
    return sendError(res, `Admin authorization failed: ${error.message}`, 500);
  }
};

/**
 * Requires a specific Admin permission (or Owner)
 * If Owner -> Allowed
 * If Admin -> Checks room.adminPermissions[permissionKey]
 * If Member -> Denied
 */
const requireAdminPermission = (permissionKey) => async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.params.id || req.body.roomId;

    const member = req.roomMember || (await RoomMember.findOne({
      roomId,
      userId: req.user._id,
    }));

    if (!member) {
      return sendError(res, 'Access denied: You are not a member of this Room', 403);
    }

    // Owner is always authorized
    if (member.role === 'owner') {
      req.roomMember = member;
      return next();
    }

    // Admin requires the specific permission enabled
    if (member.role === 'admin') {
      const room = await Room.findById(roomId);
      if (!room) {
        return sendError(res, 'Room not found', 404);
      }

      // Default to true for backwards compatibility if field is missing
      const hasPermission = room.adminPermissions?.[permissionKey] ?? true;
      if (!hasPermission) {
        return sendError(res, `Access denied: Admin does not have '${permissionKey}' permission in this room`, 403);
      }

      req.room = room;
      req.roomMember = member;
      return next();
    }

    // Regular member is denied for admin-level action
    return sendError(res, 'Access denied: Elevated Admin privileges required for this action', 403);
  } catch (error) {
    return sendError(res, `Permission verification failed: ${error.message}`, 500);
  }
};

module.exports = {
  requireRoomMembership,
  requireRoomOwner,
  requireRoomAdminOrOwner,
  requireAdminPermission,
};
