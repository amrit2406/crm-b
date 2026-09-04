const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'demo', 'reminder'],
      required: [true, 'Activity type is required']
    },
    relatedTo: {
      kind: {
        type: String,
        enum: ['Lead', 'Customer', 'Deal'],
        required: true
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'relatedTo.kind'
      }
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required']
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    },
    notes: {
      type: String,
      default: ''
    },
    completedAt: {
      type: Date,
      default: null
    },
    upcomingNotified: {
      type: Boolean,
      default: false
    },
    overdueNotified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Derived virtual property `isOverdue`
activitySchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed') return false;
  return this.dueDate ? new Date(this.dueDate) < new Date() : false;
});

// Index for query optimization
activitySchema.index({ assignedTo: 1, dueDate: 1, status: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
