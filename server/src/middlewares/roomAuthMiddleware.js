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
 * Ensures the authenticated user is the Owner of the room
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

module.exports = {
  requireRoomMembership,
  requireRoomOwner,
};
