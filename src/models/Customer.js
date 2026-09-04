const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
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
    originalLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Original lead lineage is required']
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
    }
  },
  {
    timestamps: true
  }
);

// Index for assigned user list queries
customerSchema.index({ assignedTo: 1, createdAt: -1 });

// Text index for search
customerSchema.index({ name: 'text', email: 'text', company: 'text' });

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
