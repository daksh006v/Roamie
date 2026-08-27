const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a place name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['sightseeing', 'food', 'hotel', 'beach', 'adventure', 'nightlife', 'other'],
      default: 'other',
    },
    latitude: {
      type: Number,
      required: [true, 'Please provide latitude coordinates'],
    },
    longitude: {
      type: Number,
      required: [true, 'Please provide longitude coordinates'],
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    photoUrl: {
      type: String,
      default: '',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Place', placeSchema);
