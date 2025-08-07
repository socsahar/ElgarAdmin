const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, dispatcher, user]
 */

// Create logs table if it doesn't exist
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
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
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
      // Find user in Supabase database by username
      let { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, username, password_hash, role, full_name, is_active, must_change_password, updated_at, photo_url, position')
        .eq('username', username)
        .single();

      console.log('Database query result:', { users: !!users, error: error?.message });

      if (error || !users) {
        console.log('User not found in database:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password using the correct field name (password_hash)
      const isMatch = await bcrypt.compare(password, users.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user has website access permission instead of hardcoded roles
      const { data: permissions, error: permError } = await supabaseAdmin
        .from('user_permissions')
        .select('permission')
        .eq('user_id', users.id);

      if (permError) {
        console.log('Error checking permissions:', permError);
        return res.status(500).json({ message: 'Error checking permissions' });
      }

      // Check if user has website access permission or admin access
      const userPermissions = permissions?.map(p => p.permission) || [];
      const hasWebsiteAccess = userPermissions.includes('can_connect_to_website') || 
                               userPermissions.includes('גישה לאתר');
      
      // For admin panel access, check specific roles
      const allowedRoles = [
        // Hebrew roles (as per AI instructions)
        'מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט', 'מוקדן', 'סייר',
        // Legacy English roles (for backwards compatibility)  
        'ADMIN', 'admin', 'UNIT_COMMANDER', 'unit_commander', 'DISPATCHER', 'dispatcher', 'OPS_MANAGER', 'ops_manager'
      ];
      
      const hasAdminAccess = allowedRoles.includes(users.role);
      
      // Allow access if user has either website access or admin access
      if (!hasWebsiteAccess && !hasAdminAccess) {
        console.log('No website or admin access for user:', username, 'Role:', users.role, 'Permissions:', userPermissions);
        return res.status(403).json({ message: 'אין לך הרשאה להתחבר למערכת' });
      }

      // Check if user is active
      if (!users.is_active) {
        console.log('Inactive user:', username);
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Update last login (if the column exists)
      try {
        await supabaseAdmin
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', users.id);
      } catch (updateError) {
        console.log('Could not update last login:', updateError.message);
      }

      // Generate JWT
      const token = jwt.sign(
        { 
          id: users.id, 
          role: users.role.toLowerCase(), // Normalize role to lowercase
          permissions: {
            canManageUsers: true,
            canManageIncidents: true,
            canManageVolunteers: true,
            canViewReports: true,
            canManageSystem: true,
            canAccessAdmin: true
          }
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      console.log('Successful login for user:', users.username);

      // Log successful login
      await createLog('info', `משתמש התחבר בהצלחה: ${users.full_name || users.username}`, {
        action: 'login',
        user_role: users.role,
        login_time: new Date().toISOString()
      }, users.id);

      res.json({
        success: true,
        token,
        user: {
          id: users.id,
          name: users.username, // Use username as name since no name field exists
          username: users.username,
          full_name: users.full_name,
          role: users.role.toLowerCase(),
          photo_url: users.photo_url,
          position: users.position,
          permissions: {
            canManageUsers: true,
            canManageIncidents: true,
            canManageVolunteers: true,
            canViewReports: true,
            canManageSystem: true,
            canAccessAdmin: true
          },
          isActive: users.is_active,
          mustChangePassword: users.must_change_password || false, // Add this field
          lastLogin: users.updated_at
        }
      });

    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return res.status(500).json({ message: 'Database connection error' });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/register', auth, async (req, res) => {
  try {
    // Only admins can register new users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, username, password, role } = req.body;

    // Basic validation
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Name, username and password are required' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        username,
        full_name: name,
        password_hash: hashedPassword,
        role: role || 'סייר',
        is_active: true,
        created_at: new Date().toISOString(),
        phone_number: '0500000000', // Default placeholder
        id_number: '123456789', // Default placeholder
        position: role || 'סייר'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await createLog('info', `User registered: ${username}`, {
      registeredRole: role
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.full_name,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    await createLog('error', `Registration error: ${error.message}`, {}, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', auth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username, role, created_at, is_active, id_number, photo_url, must_change_password, position')
      .eq('id', req.user.id)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      user: {
        ...user,
        mustChangePassword: user.must_change_password || false
      }
    });
  } catch (error) {
    await createLog('error', `Get profile error: ${error.message}`, {}, req.user.id);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', auth, async (req, res) => {
  try {
    await createLog('info', `User logged out: ${req.user.username}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req.user.id);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    await createLog('error', `Logout error: ${error.message}`, {}, req.user.id);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Basic validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Get user with password
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, password_hash, must_change_password')
      .eq('id', req.user.id)
      .single();

    if (error) {
      throw error;
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      await createLog('warn', 'Failed password change - wrong current password', {
        userId: user.id
      }, user.id);
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear must_change_password flag
    await supabaseAdmin
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    await createLog('info', `Password changed for user: ${user.username}`, {}, user.id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    await createLog('error', `Change password error: ${error.message}`, {}, req.user.id);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, role, permissions, phone, unit, personal_info, car_info, is_active')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        permissions: user.permissions || {},
        phone: user.phone,
        unit: user.unit,
        personalInfo: user.personal_info || {},
        carInfo: user.car_info || {},
        isActive: user.is_active
      }
    });
  } catch (error) {
    await createLog('error', `Get profile error: ${error.message}`, {}, req.user.id);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               personalInfo:
 *                 type: object
 *               carInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { 
      full_name, 
      phone_number, 
      position, 
      has_car, 
      car_type, 
      license_plate, 
      car_color 
    } = req.body;
    
    const updateData = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (position !== undefined) updateData.position = position;
    if (has_car !== undefined) updateData.has_car = has_car;
    if (car_type !== undefined) updateData.car_type = car_type;
    if (license_plate !== undefined) updateData.license_plate = license_plate;
    if (car_color !== undefined) updateData.car_color = car_color;

    updateData.updated_at = new Date().toISOString();

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, full_name, username, role, created_at, is_active, id_number, photo_url, phone_number, position, has_car, car_type, license_plate, car_color')
      .single();

    if (error) {
      await createLog('error', `Profile update error: ${error.message}`, {}, req.user.id);
      return res.status(400).json({ 
        success: false,
        message: 'Failed to update profile',
        error: error.message 
      });
    }

    await createLog('info', `Profile updated for user: ${user.full_name || user.username}`, {}, req.user.id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user
    });
  } catch (error) {
    await createLog('error', `Update profile error: ${error.message}`, {}, req.user.id);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
