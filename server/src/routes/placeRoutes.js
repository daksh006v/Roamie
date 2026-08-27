const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  addPlace,
  getPlaces,
  getPlaceById,
  deletePlace,
} = require('../controllers/placeController');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .post(addPlace)
  .get(getPlaces);

router.route('/:placeId')
  .get(getPlaceById)
  .delete(deletePlace);

module.exports = router;
