const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendUserNotification } = require('../services/pushNotificationService');

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

// @desc    Update Member Role (Owner only: promote/demote Member <-> Admin)
// @route   PUT /api/rooms/:id/members/:memberId/role
// @access  Private (Owner only)
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

    // Strictly Owner only
    const callerMembership = req.roomMember || (await RoomMember.findOne({ roomId, userId: req.user._id }));
    if (!callerMembership || callerMembership.role !== 'owner') {
      return sendError(res, 'Access denied: Only the room Owner can promote or demote members', 403);
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
      type: 'system',
      messageType: 'system',
      content: actionText,
      systemAction: actionText,
    });

    return sendSuccess(res, `Role updated to ${role} successfully`, {
      member: targetMember,
    });
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
      type: 'system',
      messageType: 'system',
      content: `${req.user.name} left the room`,
      systemAction: `${req.user.name} left the room`,
    });

    return sendSuccess(res, 'Left room successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  previewRoomByInviteCode,
  joinRoom,
  inviteContact,
  updateMemberRole,
  leaveRoom,
};
