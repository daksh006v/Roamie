const Media = require('../models/Media');
const Message = require('../models/Message');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const { uploadToStorage, deleteFromStorage } = require('../config/cloudinary');
const { sendPushNotifications } = require('../services/pushNotificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Upload photo(s) or receipts to room's isolated folder
// @route   POST /api/rooms/:roomId/media
// @access  Private (Room Member)
const uploadMedia = async (req, res) => {
  try {
    const { roomId } = req.params;
    const mediaType = req.body.mediaType || 'image';

    // Handle both single file (req.file) and multiple files (req.files)
    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

    if (files.length === 0) {
      return sendError(res, 'Please provide at least one image to upload', 400);
    }

    const uploadedMediaList = [];

    for (const file of files) {
      const storageResult = await uploadToStorage(
        file.buffer,
        roomId,
        file.originalname,
        mediaType
      );

      const media = await Media.create({
        roomId,
        uploadedBy: req.user._id,
        storageUrl: storageResult.storageUrl,
        thumbnailUrl: storageResult.thumbnailUrl,
        publicId: storageResult.publicId,
        originalFilename: file.originalname || 'photo.jpg',
        mediaType,
        width: storageResult.width,
        height: storageResult.height,
      });

      const populatedMedia = await Media.findById(media._id).populate('uploadedBy', 'name avatar email');
      uploadedMediaList.push(populatedMedia);
    }

    // If gallery photos, post system activity message & broadcast real-time socket event
    if (mediaType === 'image') {
      const count = uploadedMediaList.length;
      const countText = count === 1 ? 'a photo' : `${count} photos`;

      await Message.create({
        roomId,
        senderId: req.user._id,
        messageType: 'system',
        systemAction: `${req.user.name} added ${countText} to the gallery`,
      });

      // Emit socket event to room channel
      if (req.io) {
        req.io.to(`room:${roomId}`).emit('new_media', {
          media: uploadedMediaList,
          uploadedBy: req.user.name,
        });
      }

      // Send push notification to other members
      const otherMembers = await RoomMember.find({
        roomId,
        userId: { $ne: req.user._id },
      });
      const userIds = otherMembers.map((m) => m.userId);
      const usersToNotify = await User.find({ _id: { $in: userIds }, pushToken: { $ne: '' } });

      const pushMessages = usersToNotify.map((u) => ({
        to: u.pushToken,
        sound: 'default',
        title: 'New Trip Photos 📸',
        body: `${req.user.name} added ${countText} to the gallery`,
        data: {
          type: 'media_uploaded',
          roomId: roomId.toString(),
        },
      }));

      if (pushMessages.length > 0) {
        sendPushNotifications(pushMessages).catch((err) =>
          console.error('Media push error:', err)
        );
      }
    }

    return sendSuccess(
      res,
      `${uploadedMediaList.length} media item(s) uploaded successfully to room gallery`,
      { media: uploadedMediaList },
      201
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get Gallery Photos for a room (Supports ?after=<timestamp> for incremental offline sync)
// @route   GET /api/rooms/:roomId/media
// @access  Private (Room Member)
const getRoomMedia = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { after, mediaType, page = 1, limit = 50 } = req.query;

    const query = { roomId };
    
    // Filter by mediaType if requested, otherwise default to gallery images
    if (mediaType) {
      query.mediaType = mediaType;
    } else {
      query.mediaType = 'image';
    }

    // Incremental offline catch-up sync using lastSyncedAt timestamp (PRD section 5)
    if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const mediaList = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name avatar email');

    const total = await Media.countDocuments(query);

    return sendSuccess(res, 'Room gallery fetched successfully', {
      total,
      syncTimestamp: new Date().toISOString(),
      media: mediaList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get single media details
// @route   GET /api/rooms/:roomId/media/:mediaId
// @access  Private (Room Member)
const getMediaById = async (req, res) => {
  try {
    const { roomId, mediaId } = req.params;

    const media = await Media.findOne({ _id: mediaId, roomId }).populate('uploadedBy', 'name avatar email');
    if (!media) {
      return sendError(res, 'Media not found', 404);
    }

    return sendSuccess(res, 'Media details fetched', { media });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete media from room gallery
// @route   DELETE /api/rooms/:roomId/media/:mediaId
// @access  Private (Uploader or Room Owner)
const deleteMedia = async (req, res) => {
  try {
    const { roomId, mediaId } = req.params;

    const media = await Media.findOne({ _id: mediaId, roomId });
    if (!media) {
      return sendError(res, 'Media not found', 404);
    }

    // Check permission: uploader or room owner
    const isUploader = media.uploadedBy.toString() === req.user._id.toString();
    const isOwner = req.roomMember?.role === 'owner';

    if (!isUploader && !isOwner) {
      return sendError(res, 'Only the uploader or trip Owner can delete this photo', 403);
    }

    // Delete from cloud or local storage
    await deleteFromStorage(media.publicId, media.storageUrl);
    await Media.findByIdAndDelete(mediaId);

    return sendSuccess(res, 'Media deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  uploadMedia,
  getRoomMedia,
  getMediaById,
  deleteMedia,
};
