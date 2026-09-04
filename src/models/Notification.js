const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user is required']
    },
    type: {
      type: String,
      enum: [
        'lead_assigned',
        'deal_assigned',
        'followup_upcoming',
        'followup_overdue',
        'lead_converted',
        'deal_closed'
      ],
      required: [true, 'Notification type is required']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required']
    },
    relatedTo: {
      kind: {
        type: String,
        enum: ['Lead', 'Customer', 'Deal', 'Activity']
      },
      item: {
        type: mongoose.Schema.Types.ObjectId
      }
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for query optimization
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
