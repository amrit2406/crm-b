const mongoose = require('mongoose');
const { STAGE_PROBABILITIES } = require('../utils/dealRules');

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Associated customer is required']
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required']
    },
    stage: {
      type: String,
      enum: ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'qualification'
    },
    value: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [0, 'Deal value cannot be negative']
    },
    probability: {
      type: Number,
      min: [0, 'Probability cannot be less than 0'],
      max: [100, 'Probability cannot exceed 100']
    },
    expectedRevenue: {
      type: Number,
      default: 0
    },
    expectedClosingDate: {
      type: Date
    },
    closedAt: {
      type: Date,
      default: null
    },
    lostReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to set default probability (if omitted) and calculate expectedRevenue
dealSchema.pre('save', async function () {
  if (this.probability === undefined || this.probability === null) {
    this.probability = STAGE_PROBABILITIES[this.stage] !== undefined ? STAGE_PROBABILITIES[this.stage] : 10;
  }

  // Recalculate expected revenue: value * (probability / 100)
  this.expectedRevenue = Math.round(this.value * (this.probability / 100) * 100) / 100;
});

// Compound Index for pipeline filtering
dealSchema.index({ stage: 1, assignedTo: 1, expectedClosingDate: 1 });

module.exports = mongoose.models.Deal || mongoose.model('Deal', dealSchema);
