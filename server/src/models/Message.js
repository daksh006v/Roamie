const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.type !== 'system' && this.messageType !== 'system';
      },
    },
    // Rich message type
    type: {
      type: String,
      enum: ['text', 'image', 'system', 'poll', 'audio', 'location', 'itinerary', 'expense'],
      default: 'text',
    },
    // Main text content
    content: {
      type: String,
      trim: true,
      default: '',
    },
    // Backwards compatibility alias for content
    text: {
      type: String,
      trim: true,
      default: '',
    },
    // Media attachment details
    media: {
      url: { type: String, default: '' },
      type: { type: String, default: 'image' },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    // Backwards compatibility alias for media
    mediaUrl: {
      type: String,
      default: '',
    },
    messageType: {
      type: String,
      default: 'text',
    },
    // Discord-style reply reference
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Message emoji reactions
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
    // Rich feature metadata (Places, Itinerary, Expenses, Polls)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    systemAction: {
      type: String,
      default: '',
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save sync between text/content and mediaUrl/media.url for backward compatibility
messageSchema.pre('save', function (next) {
  if (this.content && !this.text) {
    this.text = this.content;
  } else if (this.text && !this.content) {
    this.content = this.text;
  }

  if (this.media && this.media.url && !this.mediaUrl) {
    this.mediaUrl = this.media.url;
  } else if (this.mediaUrl && (!this.media || !this.media.url)) {
    this.media = { url: this.mediaUrl, type: 'image', width: 0, height: 0 };
  }

  if (this.type && !this.messageType) {
    this.messageType = this.type;
  } else if (this.messageType && !this.type) {
    this.type = this.messageType;
  }

  next();
});

module.exports = mongoose.model('Message', messageSchema);
