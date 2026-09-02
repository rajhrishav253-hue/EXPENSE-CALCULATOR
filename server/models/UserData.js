const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: 'default',
    index: true
  },
  profile: {
    name: { type: String, default: 'Student' },
    id: { type: String, default: 'STU-2026' },
    tag: { type: String, default: 'College Student' },
    budget: { type: Number, default: 12000 },
    avatarColor: { type: String, default: '#6366f1' },
    isDefault: { type: Boolean, default: true }
  },
  budget: {
    monthlyLimit: { type: Number, default: 12000 },
    alertsEnabled: { type: Boolean, default: true },
    categoryLimits: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  currency: {
    type: String,
    default: 'INR'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'userdata'
});

module.exports = mongoose.model('UserData', userDataSchema);
