const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    relatedTo: {
      kind: {
        type: String,
        required: true,
        enum: ['Lead', 'Customer', 'Deal']
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'relatedTo.kind'
      }
    },
    action: {
      type: String,
      required: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying by entity
timelineEventSchema.index({ 'relatedTo.kind': 1, 'relatedTo.item': 1, createdAt: -1 });

module.exports =
  mongoose.models.TimelineEvent || mongoose.model('TimelineEvent', timelineEventSchema);
