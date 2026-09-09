const express = require('express');
const router = express.Router();
const {
  createRoom,
  getMyRooms,
  getRoomById,
  previewRoomByInviteCode,
  joinRoom,
  inviteContact,
  updateMemberRole,
  updateAdminPermissions,
  updateRoleColors,
  updateRoomNotifications,
  updateRoom,
  endTrip,
  toggleLockItinerary,
  leaveRoom,
  deleteRoom,
} = require('../controllers/roomController');
const chatRoutes = require('./chatRoutes');
const expenseRoutes = require('./expenseRoutes');
const mediaRoutes = require('./mediaRoutes');
const itineraryRoutes = require('./itineraryRoutes');
const placeRoutes = require('./placeRoutes');
const { protect } = require('../middlewares/authMiddleware');
const {
  requireRoomMembership,
  requireRoomOwner,
  requireRoomAdminOrOwner,
  requireAdminPermission,
} = require('../middlewares/roomAuthMiddleware');

// All room routes require authentication
router.use(protect);

router.route('/')
  .post(createRoom)
  .get(getMyRooms);

router.post('/join', joinRoom);
router.get('/invite/:inviteCode', previewRoomByInviteCode);

// Mount nested routes for room messages, expenses, media, itinerary, and places
router.use('/:roomId/messages', chatRoutes);
router.use('/:roomId/expenses', expenseRoutes);
router.use('/:roomId/media', mediaRoutes);
router.use('/:roomId/itinerary', itineraryRoutes);
router.use('/:roomId/places', placeRoutes);

// Single Room operations
router.route('/:id')
  .get(requireRoomMembership, getRoomById)
  .put(requireRoomMembership, updateRoom)
  .delete(requireRoomOwner, deleteRoom);

// Decoupled action-specific endpoints
router.post('/:id/end', requireRoomMembership, endTrip);
router.post('/:id/itinerary/lock', requireRoomMembership, toggleLockItinerary);

// Owner-only management endpoints
router.patch('/:id/admin-permissions', requireRoomOwner, updateAdminPermissions);
router.put('/:id/role-colors', requireRoomOwner, updateRoleColors);
router.put('/:id/members/:memberId/role', requireRoomOwner, updateMemberRole);

// Member personal notifications
router.put('/:id/notifications', requireRoomMembership, updateRoomNotifications);

router.post('/:id/invite', requireRoomMembership, inviteContact);
router.post('/:id/leave', requireRoomMembership, leaveRoom);

module.exports = router;
