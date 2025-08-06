const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'critical'],
    required: true,
    default: 'info'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['auth', 'user', 'event', 'attendance', 'system', 'api', 'database', 'notification'],
    required: true
  },
  source: {
    file: String,
    function: String,
    line: Number
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  requestId: {
    type: String,
    default: null
  },
  metadata: {
    request: {
      method: String,
      url: String,
      ip: String,
      userAgent: String,
      headers: mongoose.Schema.Types.Mixed
    },
    response: {
      statusCode: Number,
      responseTime: Number,
      contentLength: Number
    },
    error: {
      name: String,
      message: String,
      stack: String,
      code: String
    },
    custom: mongoose.Schema.Types.Mixed
  },
  tags: [String],
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
  },
  serverInfo: {
    hostname: String,
    pid: Number,
    memory: {
      used: Number,
      total: Number
    },
    cpu: {
      usage: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance and querying
logSchema.index({ level: 1, createdAt: -1 });
logSchema.index({ category: 1, createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ createdAt: -1 });
logSchema.index({ tags: 1 });
logSchema.index({ 'metadata.request.ip': 1 });

// TTL index to automatically delete old logs (90 days)
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to create different types of logs
logSchema.statics.createLog = function(level, message, category, metadata = {}, user = null) {
  return this.create({
    level,
    message,
    category,
    metadata,
    user,
    environment: process.env.NODE_ENV || 'development',
    serverInfo: {
      hostname: require('os').hostname(),
      pid: process.pid,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  });
};

// Static methods for specific log types
logSchema.statics.logAuth = function(message, user, metadata = {}) {
  return this.createLog('info', message, 'auth', metadata, user);
};

logSchema.statics.logError = function(error, category = 'system', user = null, metadata = {}) {
  return this.createLog('error', error.message, category, {
    ...metadata,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  }, user);
};

logSchema.statics.logAPI = function(req, res, responseTime) {
  return this.createLog('info', `${req.method} ${req.originalUrl}`, 'api', {
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: req.headers
    },
    response: {
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length')
    }
  }, req.user?.id);
};

logSchema.statics.logUser = function(action, user, targetUser = null, metadata = {}) {
  return this.createLog('info', `User ${action}`, 'user', {
    ...metadata,
    targetUser: targetUser?._id,
    action
  }, user);
};

logSchema.statics.logEvent = function(action, event, user, metadata = {}) {
  return this.createLog('info', `Event ${action}: ${event.title}`, 'event', {
    ...metadata,
    eventId: event._id,
    action
  }, user);
};

// Static method to get log statistics
logSchema.statics.getStats = function(dateRange = {}) {
  const matchQuery = {};
  
  if (dateRange.start || dateRange.end) {
    matchQuery.createdAt = {};
    if (dateRange.start) matchQuery.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchQuery.createdAt.$lte = new Date(dateRange.end);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          level: '$level',
          category: '$category'
        },
        count: { $sum: 1 },
        latestLog: { $max: '$createdAt' }
      }
    },
    {
      $group: {
        _id: '$_id.level',
        categories: {
          $push: {
            category: '$_id.category',
            count: '$count',
            latestLog: '$latestLog'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

module.exports = mongoose.model('Log', logSchema);
