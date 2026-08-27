const Place = require('../models/Place');
const RoomMember = require('../models/RoomMember');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Add a saved place to a room
// @route   POST /api/rooms/:roomId/places
// @access  Private (Room Member)
const addPlace = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      name,
      description,
      category,
      latitude,
      longitude,
      address,
      photoUrl,
    } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return sendError(res, 'Please provide place name, latitude, and longitude', 400);
    }

    const place = await Place.create({
      roomId,
      name: name.trim(),
      description: description ? description.trim() : '',
      category: category || 'other',
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address ? address.trim() : '',
      photoUrl: photoUrl || '',
      addedBy: req.user._id,
    });

    const populatedPlace = await Place.findById(place._id).populate('addedBy', 'name avatar email');

    // Broadcast to room channel
    if (req.io) {
      req.io.to(`room:${roomId}`).emit('new_place', populatedPlace);
    }

    return sendSuccess(res, 'Place saved successfully', { place: populatedPlace }, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get all saved places for a room (filterable by category)
// @route   GET /api/rooms/:roomId/places
// @access  Private (Room Member)
const getPlaces = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { category } = req.query;

    const query = { roomId };
    if (category) {
      query.category = category;
    }

    const places = await Place.find(query)
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name avatar email');

    return sendSuccess(res, 'Saved places fetched', {
      total: places.length,
      places,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get place by ID
// @route   GET /api/rooms/:roomId/places/:placeId
// @access  Private (Room Member)
const getPlaceById = async (req, res) => {
  try {
    const { roomId, placeId } = req.params;

    const place = await Place.findOne({ _id: placeId, roomId }).populate('addedBy', 'name avatar email');
    if (!place) {
      return sendError(res, 'Place not found', 404);
    }

    return sendSuccess(res, 'Place details fetched', { place });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete a saved place
// @route   DELETE /api/rooms/:roomId/places/:placeId
// @access  Private (Uploader or Room Owner)
const deletePlace = async (req, res) => {
  try {
    const { roomId, placeId } = req.params;

    const place = await Place.findOne({ _id: placeId, roomId });
    if (!place) {
      return sendError(res, 'Place not found', 404);
    }

    const isUploader = place.addedBy.toString() === req.user._id.toString();
    const isOwner = req.roomMember.role === 'owner';

    if (!isUploader && !isOwner) {
      return sendError(res, 'Only the person who added the place or the trip Owner can delete it', 403);
    }

    await Place.findByIdAndDelete(placeId);

    return sendSuccess(res, 'Place removed from saved places');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  addPlace,
  getPlaces,
  getPlaceById,
  deletePlace,
};
