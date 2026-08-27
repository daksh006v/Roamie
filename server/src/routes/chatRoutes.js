const express = require('express');
const router = express.Router({ mergeParams: true });
const { getMessages, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;
