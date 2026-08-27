const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  addItineraryItem,
  getItinerary,
  updateItineraryItem,
  deleteItineraryItem,
} = require('../controllers/itineraryController');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .post(addItineraryItem)
  .get(getItinerary);

router.route('/:itemId')
  .put(updateItineraryItem)
  .delete(deleteItineraryItem);

module.exports = router;
