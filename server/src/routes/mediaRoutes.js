const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  uploadMedia,
  getRoomMedia,
  getMediaById,
  deleteMedia,
} = require('../controllers/mediaController');
const upload = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .post(upload.array('images', 10), uploadMedia)
  .get(getRoomMedia);

router.route('/:mediaId')
  .get(getMediaById)
  .delete(deleteMedia);

module.exports = router;
