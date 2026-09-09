const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getMessages,
  sendMessage,
  toggleReaction,
  deleteMessage,
  togglePinMessage,
} = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .get(getMessages)
  .post(sendMessage);

router.post('/:messageId/reactions', toggleReaction);
router.post('/:messageId/pin', togglePinMessage);
router.delete('/:messageId', deleteMessage);

module.exports = router;
