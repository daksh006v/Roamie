const express = require('express');
const router = express.Router();
const {
  createRoom,
  getMyRooms,
  getRoomById,
  previewRoomByInviteCode,
  joinRoom,
  inviteContact,
  updateRoom,
  leaveRoom,
  deleteRoom,
} = require('../controllers/roomController');
const chatRoutes = require('./chatRoutes');
const { protect } = require('../middlewares/authMiddleware');
const {
  requireRoomMembership,
  requireRoomOwner,
} = require('../middlewares/roomAuthMiddleware');

// All room routes require authentication
router.use(protect);

router.route('/')
  .post(createRoom)
  .get(getMyRooms);

router.post('/join', joinRoom);
router.get('/invite/:inviteCode', previewRoomByInviteCode);

// Mount nested routes for room messages
router.use('/:roomId/messages', chatRoutes);

router.route('/:id')
  .get(requireRoomMembership, getRoomById)
  .put(requireRoomMembership, requireRoomOwner, updateRoom)
  .delete(requireRoomMembership, requireRoomOwner, deleteRoom);

router.post('/:id/invite', requireRoomMembership, inviteContact);
router.post('/:id/leave', requireRoomMembership, leaveRoom);

module.exports = router;
