const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    company: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'social_media', 'email', 'phone'],
      required: [true, 'Lead source is required']
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted'],
      default: 'new'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user is required']
    },
    notes: [noteSchema],
    convertedToCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    isConverted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for filtering and sorting
leadSchema.index({ status: 1, priority: 1, assignedTo: 1, createdAt: -1 });

// Text Index for basic search
leadSchema.index({ name: 'text', email: 'text', company: 'text' });

module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
