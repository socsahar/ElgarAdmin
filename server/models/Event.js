const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['training', 'operation', 'meeting', 'drill', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['invited', 'confirmed', 'declined', 'maybe'],
      default: 'invited'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: {
      type: Date
    }
  }],
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkInTime: {
      type: Date,
      default: Date.now
    },
    checkOutTime: {
      type: Date
    },
    status: {
      type: String,
      enum: ['present', 'יוצא', 'absent'],
      default: 'present'
    },
    notes: String
  }],
  requirements: {
    equipment: [String],
    skills: [String],
    certification: [String]
  },
  maxParticipants: {
    type: Number,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notifications: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    reminders: [{
      sentAt: Date,
      type: {
        type: String,
        enum: ['24h', '2h', '30m']
      }
    }]
  },
  metadata: {
    weather: String,
    temperature: Number,
    conditions: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
eventSchema.index({ startTime: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ 'participants.user': 1 });

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
  return this.endTime - this.startTime;
});

// Virtual for attendee count
eventSchema.virtual('attendeeCount').get(function() {
  return this.attendees.length;
});

// Virtual for "יוצא" count
eventSchema.virtual('outCount').get(function() {
  return this.attendees.filter(attendee => attendee.status === 'יוצא').length;
});

module.exports = mongoose.model('Event', eventSchema);
