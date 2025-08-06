const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

// Create logs function
const createLog = async (level, message, metadata = {}, userId = null) => {
  try {
    await supabaseAdmin
      .from('logs')
      .insert({
        level,
        message,
        source: 'Web', // Required field - indicates this is from the web admin interface
        metadata,
        user_id: userId,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to create log:', error);
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      await createLog('warn', 'Authentication attempt without token', {
        request: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl
        }
      });
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user from Supabase
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username, role, is_active')
      .eq('id', decoded.id)
      .single();
    
    if (error || !user) {
      await createLog('warn', 'Authentication with invalid user ID', {
        userId: decoded.id,
        request: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      await createLog('warn', 'Authentication attempt by inactive user', {
        userId: user.id,
        request: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    await createLog('error', `Auth middleware error: ${error.message}`, {
      request: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      }
    });
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  const adminRoles = ['אדמין', 'מפתח', 'admin']; // Support both Hebrew and English
  if (!adminRoles.includes(req.user.role)) {
    createLog('warn', 'Unauthorized admin access attempt', {
      userId: req.user.id,
      userRole: req.user.role,
      attemptedUrl: req.originalUrl
    }, req.user.id);
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is admin or dispatcher
const dispatcherOrAdmin = (req, res, next) => {
  const allowedRoles = ['אדמין', 'מפתח', 'מוקדן', 'admin', 'dispatcher']; // Support both Hebrew and English
  if (!allowedRoles.includes(req.user.role)) {
    createLog('warn', 'Unauthorized dispatcher access attempt', {
      userId: req.user.id,
      userRole: req.user.role,
      attemptedUrl: req.originalUrl
    }, req.user.id);
    return res.status(403).json({ message: 'Dispatcher or admin access required' });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminOnly,
  dispatcherOrAdmin
};
