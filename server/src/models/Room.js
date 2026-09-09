const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a room name'],
      trim: true,
      maxlength: 100,
    },
    destination: {
      type: String,
      required: [true, 'Please provide a destination'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    inviteCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed'],
      default: 'planning',
    },
    isItineraryLocked: {
      type: Boolean,
      default: false,
    },
    adminPermissions: {
      editRoom: { type: Boolean, default: true },
      manageMembers: { type: Boolean, default: true },
      manageItinerary: { type: Boolean, default: true },
      lockItinerary: { type: Boolean, default: true },
      manageExpenses: { type: Boolean, default: true },
      managePhotos: { type: Boolean, default: true },
      managePlaces: { type: Boolean, default: true },
      endTrip: { type: Boolean, default: true },
    },
    roleColors: {
      owner: { type: String, default: '#C96A25' },
      admin: { type: String, default: '#5F745F' },
      member: { type: String, default: '#59615A' },
    },
    permissions: {
      members: {
        canAddItinerary: { type: Boolean, default: true },
        canAddExpenses: { type: Boolean, default: true },
        canUploadMedia: { type: Boolean, default: true },
        canAddPlaces: { type: Boolean, default: true },
        canInvite: { type: Boolean, default: true },
      },
      admins: {
        canEditTripInfo: { type: Boolean, default: true },
        canManageRoles: { type: Boolean, default: true },
        canEndTrip: { type: Boolean, default: true },
        canDeleteRoom: { type: Boolean, default: false },
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
