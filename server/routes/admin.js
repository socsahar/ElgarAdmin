const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');

// Create logs utility function
const createLog = async (level, message, metadata = {}, userId = null) => {
  try {
    await supabaseAdmin
      .from('logs')
      .insert({
        level,
        message,
        source: 'Web',
        metadata,
        user_id: userId,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to create log:', error);
  }
};

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  const adminRoles = ['אדמין', 'מפתח', 'admin']; // Include Hebrew and English admin roles
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to check super role privileges (אדמין or מפתח)
const requireSuperRole = (req, res, next) => {
  const superRoles = ['אדמין', 'מפתח', 'admin']; // Include 'admin' for backward compatibility
  if (!superRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Super role access required (אדמין or מפתח)' });
  }
  next();
};

// Middleware to check permission management access
const requirePermissionManagement = (req, res, next) => {
  const user = req.user;
  const managementRoles = ['אדמין', 'מפתח', 'admin']; // Include Hebrew and English admin roles
  
  if (!managementRoles.includes(user.role) && (!user.permissions || !user.permissions.canManageUsers)) {
    return res.status(403).json({ message: 'Permission management access required' });
  }
  next();
};

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', auth, requirePermissionManagement, async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, id_number, username, full_name, role, phone_number, is_active, photo_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch users' });
    }

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        id_number: user.id_number,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        phone_number: user.phone_number,
        photo_url: user.photo_url,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/permissions:
 *   put:
 *     summary: Update user permissions (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 */
router.put('/users/:userId/permissions', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    // Validate permissions object
    const validPermissions = {
      canManageUsers: Boolean(permissions.canManageUsers),
      canManageIncidents: Boolean(permissions.canManageIncidents),
      canManageVolunteers: Boolean(permissions.canManageVolunteers),
      canViewReports: Boolean(permissions.canViewReports),
      canManageSystem: Boolean(permissions.canManageSystem),
      canAccessAdmin: Boolean(permissions.canAccessAdmin),
      canConnectToWebsite: Boolean(permissions.canConnectToWebsite)
    };

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ permissions: validPermissions })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: 'Failed to update permissions' });
    }

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/role:
 *   put:
 *     summary: Update user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, unit_commander, dispatcher, ops_manager, user]
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.put('/users/:userId/role', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'unit_commander', 'dispatcher', 'ops_manager', 'user', 'סייר'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Set default permissions based on role
    let defaultPermissions = {};
    switch (role) {
      case 'admin':
        defaultPermissions = {
          canManageUsers: true,
          canManageIncidents: true,
          canManageVolunteers: true,
          canViewReports: true,
          canManageSystem: true,
          canAccessAdmin: true,
          canConnectToWebsite: true
        };
        break;
      case 'unit_commander':
        defaultPermissions = {
          canManageUsers: false,
          canManageIncidents: true,
          canManageVolunteers: true,
          canViewReports: true,
          canManageSystem: false,
          canAccessAdmin: true,
          canConnectToWebsite: true
        };
        break;
      case 'dispatcher':
        defaultPermissions = {
          canManageUsers: false,
          canManageIncidents: true,
          canManageVolunteers: false,
          canViewReports: true,
          canManageSystem: false,
          canAccessAdmin: true,
          canConnectToWebsite: true
        };
        break;
      case 'ops_manager':
        defaultPermissions = {
          canManageUsers: false,
          canManageIncidents: true,
          canManageVolunteers: true,
          canViewReports: true,
          canManageSystem: false,
          canAccessAdmin: true,
          canConnectToWebsite: true
        };
        break;
      case 'סייר':
        defaultPermissions = {
          canManageUsers: false,
          canManageIncidents: false,
          canManageVolunteers: false,
          canViewReports: false,
          canManageSystem: false,
          canAccessAdmin: false,
          canConnectToWebsite: true
        };
        break;
      default:
        defaultPermissions = {
          canManageUsers: false,
          canManageIncidents: false,
          canManageVolunteers: false,
          canViewReports: false,
          canManageSystem: false,
          canAccessAdmin: false,
          canConnectToWebsite: true
        };
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ 
        role: role,
        permissions: defaultPermissions 
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: 'Failed to update role' });
    }

    // Log the role update action
    await createLog('info', `שינוי תפקיד: ${user.full_name || user.username} שונה לתפקיד ${role}`, {
      action: 'role_update',
      target_user_id: userId,
      target_user_name: user.full_name || user.username,
      old_role: req.body.old_role || 'לא ידוע',
      new_role: role,
      admin_user: req.user.full_name || req.user.username
    }, req.user.id);

    res.json({
      success: true,
      message: 'Role updated successfully',
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Update user active status (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put('/users/:userId/status', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: 'Failed to update status' });
    }

    // Log the user status change
    await createLog('info', `סטטוס משתמש שונה: ${user.full_name || user.username} ${isActive ? 'הופעל' : 'הושבת'}`, {
      action: 'user_status_change',
      target_user_id: userId,
      target_user_name: user.full_name || user.username,
      new_status: isActive ? 'פעיל' : 'לא פעיל',
      admin_user: req.user.full_name || req.user.username
    }, req.user.id);

    res.json({
      success: true,
      message: 'User status updated successfully',
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        isActive: user.is_active
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/reset-password:
 *   put:
 *     summary: Reset user password to default (אדמין and מפתח only)
 *     tags: [Admin, Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/reset-password', auth, requireSuperRole, async (req, res) => {
  try {
    const { userId } = req.params;

    // Hash the default password
    const defaultPassword = '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update user's password and set must_change_password flag
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, full_name, role')
      .single();

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ 
        success: false,
        message: 'Failed to reset password' 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log(`Password reset by ${req.user.role} ${req.user.username} for user ${user.username}`);

    res.json({
      success: true,
      message: `Password reset successfully for ${user.full_name || user.username}`,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during password reset' 
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/force-disconnect:
 *   post:
 *     summary: Force disconnect user (מפתח only)
 *     tags: [Admin, Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User disconnected successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found or not online
 */
router.post('/users/:userId/force-disconnect', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only מפתח users can force disconnect others
    if (req.user.role !== 'מפתח') {
      return res.status(403).json({ 
        success: false,
        message: 'רק מפתח יכול לנתק משתמשים בכוח' 
      });
    }

    // Get user details for logging
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, role')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ 
        success: false,
        message: 'המשתמש לא נמצא' 
      });
    }

    // Get io instance and find user's socket
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ 
        success: false,
        message: 'Socket server not available' 
      });
    }

    const sockets = await io.fetchSockets();
    const userSocket = sockets.find(socket => 
      socket.userInfo && socket.userInfo.id === userId
    );

    if (!userSocket) {
      return res.status(404).json({ 
        success: false,
        message: 'המשתמש אינו מחובר כרגע' 
      });
    }

    // Disconnect the user
    userSocket.emit('force-disconnect', {
      message: 'חיבורך נותק על ידי מנהל המערכת',
      reason: 'ADMIN_DISCONNECT'
    });
    
    userSocket.disconnect(true);

    console.log(`🔌 User ${targetUser.username} force disconnected by ${req.user.username}`);

    res.json({
      success: true,
      message: `המשתמש ${targetUser.full_name || targetUser.username} נותק בהצלחה`,
      disconnectedUser: {
        id: targetUser.id,
        username: targetUser.username,
        full_name: targetUser.full_name,
        role: targetUser.role
      }
    });
  } catch (error) {
    console.error('Error force disconnecting user:', error);
    res.status(500).json({ 
      success: false,
      message: 'שגיאת שרת בניתוק המשתמש' 
    });
  }
});

/**
 * @swagger
 * /api/admin/online-users/cleanup:
 *   post:
 *     summary: Clean up stale online users (מפתח only)
 *     tags: [Admin, Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post('/online-users/cleanup', auth, async (req, res) => {
  try {
    // Only מפתח users can cleanup
    if (req.user.role !== 'מפתח') {
      return res.status(403).json({ 
        success: false,
        message: 'רק מפתח יכול לנקות משתמשים מחוברים' 
      });
    }

    // Get the io instance from app
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ 
        success: false,
        message: 'Socket server not available' 
      });
    }

    // Get all connected sockets
    const sockets = await io.fetchSockets();
    let cleanedUp = 0;

    // Check each socket for validity
    for (const socket of sockets) {
      // If socket has no userInfo or invalid userInfo, disconnect it
      if (!socket.userInfo || 
          !socket.userInfo.id || 
          !socket.userInfo.username ||
          !socket.userInfo.full_name ||
          socket.userInfo.full_name.trim() === '') {
        
        console.log('🧹 Cleaning up invalid socket:', socket.userInfo);
        socket.disconnect(true);
        cleanedUp++;
      }
    }

    // Force refresh online users list
    const remainingSockets = await io.fetchSockets();
    const validOnlineUsers = remainingSockets
      .filter(s => s.userInfo && s.userInfo.id)
      .map(s => s.userInfo);
      
    io.to('admin-room').emit('online-users-updated', validOnlineUsers);

    res.json({
      success: true,
      message: `ניקיון הושלם - ${cleanedUp} חיבורים לא תקינים נוקו`,
      cleanedUp: cleanedUp,
      remainingOnline: validOnlineUsers.length
    });
  } catch (error) {
    console.error('Error cleaning up online users:', error);
    res.status(500).json({ 
      success: false,
      message: 'שגיאת שרת' 
    });
  }
});

// Event Management Routes

/**
 * @swagger
 * /api/admin/events:
 *   get:
 *     summary: Get all events
 *     tags: [Admin, Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 */
router.get('/events', auth, async (req, res) => {
  try {
    
    // Fetch events from database with volunteer assignments
    
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        creator:created_by_id(id, username, full_name),
        closed_by:closed_by_id(id, username, full_name),
        assigned_volunteers:event_volunteer_assignments(
          id,
          volunteer_id,
          assigned_by_id,
          assigned_at,
          status,
          notes,
          volunteer:volunteer_id(
            id,
            username,
            full_name,
            phone_number,
            role,
            is_active,
            photo_url,
            id_number
          ),
          assigned_by:assigned_by_id(
            id,
            username,
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /events - Supabase error:', error);
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.details || 'No additional details'
    });
  }
});

/**
 * @swagger
 * /api/admin/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Admin, Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - full_address
 *               - details
 *               - license_plate
 *             properties:
 *               title:
 *                 type: string
 *               full_address:
 *                 type: string
 *               details:
 *                 type: string
 *               license_plate:
 *                 type: string
 *               status:
 *                 type: string
 *               creator_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 */
router.post('/events', auth, async (req, res) => {
  try {
    
    const { 
      title, 
      full_address, 
      details, 
      license_plate, 
      car_model,
      car_color,
      car_status,
      status = 'דווח' 
    } = req.body;
    
    const insertData = {
      title,
      full_address,
      details,
      license_plate,
      car_model,
      car_color,
      car_status,
      event_status: status, // Changed from 'status' to 'event_status' to match schema
      created_by_id: req.user.id, // Changed from 'creator_id' to 'created_by_id' to match schema
      started_at: new Date().toISOString(), // Add started_at timestamp
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert([insertData])
      .select(`
        *,
        creator:created_by_id(id, username, full_name)
      `)
      .single();

    if (error) {
      console.error('POST /events - Supabase error:', error);
      throw error;
    }

    // Log the event creation
    await createLog('info', `אירוע חדש נוצר: ${title} (${license_plate || 'ללא מספר רכב'})`, {
      action: 'event_created',
      event_id: data.id,
      event_title: title,
      event_address: full_address,
      license_plate: license_plate,
      created_by: req.user.full_name || req.user.username
    }, req.user.id);
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.details || 'No additional details'
    });
  }
});

/**
 * @swagger
 * /api/admin/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Admin, Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               full_address:
 *                 type: string
 *               details:
 *                 type: string
 *               license_plate:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 */
router.put('/events/:id', auth, async (req, res) => {
  try {
    
    const { id } = req.params;
    const { 
      title, 
      full_address, 
      details, 
      license_plate, 
      car_model,
      car_color,
      car_status,
      status 
    } = req.body;
    
    const updateData = {
      title,
      full_address,
      details,
      license_plate,
      car_model,
      car_color,
      car_status,
      event_status: status, // Changed from 'status' to 'event_status' to match schema
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:created_by_id(id, username, full_name)
      `)
      .single();

    if (error) {
      console.error('PUT /events/:id - Supabase error:', error);
      throw error;
    }

    // Log the event update
    await createLog('info', `אירוע עודכן: ${data.title} (${data.license_plate || 'ללא מספר רכב'})`, {
      action: 'event_updated',
      event_id: data.id,
      event_title: data.title,
      event_status: data.event_status,
      updated_by: req.user.full_name || req.user.username,
      changes: updateData
    }, req.user.id);
    
    res.json(data);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.details || 'No additional details'
    });
  }
});

/**
 * @swagger
 * /api/admin/events/{id}/close:
 *   post:
 *     summary: Close an event with closure reason
 *     tags: [Admin, Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               closure_reason:
 *                 type: string
 *                 description: Reason for closing the event
 *     responses:
 *       200:
 *         description: Event closed successfully
 */
router.post('/events/:id/close', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { closure_reason } = req.body;

    if (!closure_reason || closure_reason.trim() === '') {
      return res.status(400).json({ message: 'חובה לספק סיבת סגירה' });
    }

    // First, get the current event data for logging
    const { data: eventData, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching event for closure:', fetchError);
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    // Check if event is already closed
    if (eventData.closure_reason) {
      return res.status(400).json({ message: 'האירוע כבר סגור' });
    }

    // Update the event with closure information
    const { data, error } = await supabaseAdmin
      .from('events')
      .update({
        event_status: 'הסתיים',
        closure_reason: closure_reason.trim(),
        closed_at: new Date().toISOString(),
        closed_by_id: req.user.id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error closing event:', error);
      return res.status(500).json({ message: 'שגיאה בסגירת האירוע' });
    }

    // Log the event closure
    await createLog('info', `אירוע נסגר: ${eventData.title} - סיבה: ${closure_reason}`, {
      action: 'event_closed',
      event_id: eventData.id,
      event_title: eventData.title,
      license_plate: eventData.license_plate,
      closure_reason: closure_reason,
      closed_by: req.user.full_name || req.user.username
    }, req.user.id);

    res.json({
      message: 'האירוע נסגר בהצלחה',
      event: data
    });
  } catch (error) {
    console.error('Error closing event:', error);
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

/**
 * @swagger
 * /api/admin/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Admin, Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 */
router.delete('/events/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event details before deletion for logging
    const { data: eventData, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id, title, license_plate, event_status')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching event for deletion:', fetchError);
    }
    
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log the event deletion
    if (eventData) {
      await createLog('warn', `אירוע נמחק: ${eventData.title} (${eventData.license_plate || 'ללא מספר רכב'})`, {
        action: 'event_deleted',
        event_id: eventData.id,
        event_title: eventData.title,
        license_plate: eventData.license_plate,
        deleted_by: req.user.full_name || req.user.username
      }, req.user.id);
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Admin, Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/users', auth, requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, role = 'user', phone_number, id_number, position } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const validRoles = ['admin', 'unit_commander', 'dispatcher', 'ops_manager', 'user', 'סייר'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // User permissions are automatically assigned by database trigger based on role
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        username,
        password_hash: hashedPassword,
        full_name,
        role,
        phone_number: phone_number || '000-000-0000', // Default phone if not provided
        id_number: id_number || '000000000', // Default ID if not provided
        position: position || role, // Use role as position if not provided
        has_car: false, // Default to no car to avoid car field constraints
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(400).json({ message: 'Failed to create user' });
    }

    // Log the user creation
    await createLog('info', `משתמש חדש נוצר: ${full_name || username} (${role})`, {
      action: 'user_created',
      target_user_id: user.id,
      target_user_name: full_name || username,
      target_user_role: role,
      created_by: req.user.full_name || req.user.username
    }, req.user.id);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin, Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/users/:userId', auth, requireSuperRole, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details before deletion for logging
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user for deletion:', fetchError);
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deletion of the current user
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    // Log the user deletion
    await createLog('warn', `משתמש נמחק: ${userData.full_name || userData.username} (${userData.role})`, {
      action: 'user_deleted',
      target_user_id: userData.id,
      target_user_name: userData.full_name || userData.username,
      target_user_role: userData.role,
      deleted_by: req.user.full_name || req.user.username
    }, req.user.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
