const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storageUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    publicId: {
      type: String,
      required: true, // Cloudinary or storage unique key
    },
    originalFilename: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'receipt'],
      default: 'image',
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

mediaSchema.index({ roomId: 1, mediaType: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);
