const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    notifications: {
      muted: { type: Boolean, default: false },
      chat: { type: Boolean, default: true },
      expenses: { type: Boolean, default: true },
      itinerary: { type: Boolean, default: true },
      gallery: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate room memberships
roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RoomMember', roomMemberSchema);
