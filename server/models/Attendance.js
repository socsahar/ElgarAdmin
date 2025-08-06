const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkOutTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['present', 'יוצא', 'absent', 'late'],
    default: 'present'
  },
  location: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String,
    accuracy: Number
  },
  notes: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  markedOutBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    reason: String
  },
  approvedBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    status: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending'
    }
  },
  metadata: {
    deviceInfo: {
      platform: String,
      version: String,
      model: String
    },
    networkInfo: {
      type: String,
      strength: Number
    },
    batteryLevel: Number
  }
}, {
  timestamps: true
});

// Compound indexes for better performance
attendanceSchema.index({ user: 1, event: 1 }, { unique: true });
attendanceSchema.index({ event: 1, status: 1 });
attendanceSchema.index({ user: 1, checkInTime: -1 });
attendanceSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to calculate duration
attendanceSchema.pre('save', function(next) {
  if (this.checkOutTime && this.checkInTime) {
    this.duration = Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60)); // in minutes
  }
  next();
});

// Instance method to mark as "יוצא"
attendanceSchema.methods.markAsOut = function(markedBy, reason) {
  this.status = 'יוצא';
  this.markedOutBy = {
    user: markedBy,
    timestamp: new Date(),
    reason: reason || 'User marked as out'
  };
  return this.save();
};

// Static method to get attendance stats for an event
attendanceSchema.statics.getEventStats = function(eventId) {
  return this.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

// Static method to get user attendance history
attendanceSchema.statics.getUserStats = function(userId, dateRange = {}) {
  const matchQuery = { user: mongoose.Types.ObjectId(userId) };
  
  if (dateRange.start || dateRange.end) {
    matchQuery.checkInTime = {};
    if (dateRange.start) matchQuery.checkInTime.$gte = new Date(dateRange.start);
    if (dateRange.end) matchQuery.checkInTime.$lte = new Date(dateRange.end);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);
