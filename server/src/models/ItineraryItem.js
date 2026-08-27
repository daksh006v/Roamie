const mongoose = require('mongoose');

const itineraryItemSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide an itinerary title'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date for the activity'],
    },
    startTime: {
      type: String, // format "HH:mm"
      default: '',
    },
    endTime: {
      type: String, // format "HH:mm"
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      default: null,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    reminderMinutesBefore: {
      type: Number, // e.g., 30 for 30 mins before
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ItineraryItem', itineraryItemSchema);
