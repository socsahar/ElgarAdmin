const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');
const { createUserVehicle, updateUserVehicle } = require('../utils/vehicleHelpers');
const bcrypt = require('bcrypt');

// Middleware to check admin privileges
const requireSuperRole = (req, res, next) => {
  const superRoles = ['מפתח', 'אדמין', 'פיקוד יחידה'];
  if (!superRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'גישה מוגבלת - נדרשות הרשאות מנהל',
      message: 'Access denied - admin privileges required' 
    });
  }
  next();
};

/**
 * Get single user by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, username, full_name, phone_number, id_number, position, role, 
        has_car, car_type, license_plate, car_color, photo_url,
        is_active, created_at, updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return res.status(404).json({ 
        error: 'המשתמש לא נמצא',
        message: 'User not found' 
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Get single user error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת',
      message: 'Server error' 
    });
  }
});

/**
 * Get all users
 */
router.get('/', auth, async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, username, full_name, phone_number, id_number, position, role, 
        has_car, car_type, license_plate, car_color, photo_url,
        is_active, created_at, updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ 
        error: 'שגיאה בטעינת המשתמשים',
        message: 'Failed to fetch users' 
      });
    }

    res.json(users || []);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת',
      message: 'Server error' 
    });
  }
});

/**
 * Create new user
 */
router.post('/', auth, requireSuperRole, async (req, res) => {
  try {
    const { 
      username, full_name, phone_number, id_number, position, password, role, 
      has_car, car_type, license_plate, car_color, photo_url, is_active 
    } = req.body;

    // Comprehensive validation
    if (!username || !full_name || !phone_number || !id_number || !position || !role) {
      return res.status(400).json({ 
        error: 'נא למלא את כל השדות הנדרשים: שם משתמש, שם מלא, טלפון, תעודת זהות, תפקיד ורמת הרשאה',
        message: 'Missing required fields' 
      });
    }

    // Phone number validation (Israeli format)
    const phoneRegex = /^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ 
        error: 'מספר הטלפון חייב להיות בפורמט ישראלי תקין (למשל: 0501234567)',
        message: 'Invalid phone number format' 
      });
    }

    // ID number validation (exactly 9 digits)
    const idRegex = /^[0-9]{9}$/;
    if (!idRegex.test(id_number)) {
      return res.status(400).json({ 
        error: 'תעודת הזהות חייבת להכיל בדיוק 9 ספרות',
        message: 'Invalid ID number format' 
      });
    }

    // Car fields validation if user has a car
    if (has_car && (!car_type || !license_plate || !car_color)) {
      return res.status(400).json({ 
        error: 'נא למלא את כל פרטי הרכב או לסמן "אין רכב"',
        message: 'Car information incomplete' 
      });
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: 'שם המשתמש כבר קיים במערכת',
        message: 'Username already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password || '123456', saltRounds);

    // Prepare user data
    const userData = {
      username,
      full_name,
      phone_number,
      id_number,
      position,
      password_hash: hashedPassword, // Use password_hash field name
      role,
      has_car: has_car !== false, // Default to true
      car_type: has_car ? car_type : null,
      license_plate: has_car ? license_plate : null,
      car_color: has_car ? car_color : null,
      photo_url: photo_url || null,
      is_active: is_active !== undefined ? is_active : true,
      must_change_password: true, // Force password change on first login
      created_at: new Date().toISOString()
    };

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select(`
        id, username, full_name, phone_number, id_number, position, role,
        has_car, car_type, license_plate, car_color, photo_url,
        is_active, created_at
      `)
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ 
        error: 'שגיאה ביצירת המשתמש: ' + error.message,
        message: 'Failed to create user' 
      });
    }

    // After user is created successfully, create vehicle if user has a car
    let vehicleData = null;
    if (newUser.has_car) {
      try {
        vehicleData = await createUserVehicle(userData, newUser.id);
        console.log(`✅ Vehicle created for user ${newUser.full_name}`);
      } catch (vehicleError) {
        console.error('Error creating vehicle for user:', vehicleError);
        // Note: We don't fail the user creation if vehicle creation fails
        // This ensures user creation is robust
      }
    }

    // Return user data with vehicle information if created
    const response = {
      ...newUser,
      vehicle: vehicleData
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת',
      message: 'Server error' 
    });
  }
});

/**
 * Update user
 */
router.put('/:id', auth, requireSuperRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      full_name, phone_number, id_number, position, role, 
      has_car, car_type, license_plate, car_color, photo_url, is_active 
    } = req.body;

    // Cannot modify admin user
    if (id === '1') {
      return res.status(403).json({ 
        error: 'לא ניתן לערוך את משתמש האדמין',
        message: 'Cannot modify admin user' 
      });
    }

    // Validation for required fields
    if (!full_name || !phone_number || !id_number || !position) {
      return res.status(400).json({ 
        error: 'נא למלא את כל השדות הנדרשים',
        message: 'Missing required fields' 
      });
    }

    // Phone number validation
    const phoneRegex = /^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ 
        error: 'מספר הטלפון חייב להיות בפורמט ישראלי תקין',
        message: 'Invalid phone number format' 
      });
    }

    // ID number validation
    const idRegex = /^[0-9]{9}$/;
    if (!idRegex.test(id_number)) {
      return res.status(400).json({ 
        error: 'תעודת הזהות חייבת להכיל בדיוק 9 ספרות',
        message: 'Invalid ID number format' 
      });
    }

    // Car fields validation if user has a car
    if (has_car && (!car_type || !license_plate || !car_color)) {
      return res.status(400).json({ 
        error: 'נא למלא את כל פרטי הרכב או לסמן "אין רכב"',
        message: 'Car information incomplete' 
      });
    }

    const updateData = {
      full_name,
      phone_number,
      id_number,
      position,
      role,
      has_car: has_car !== false,
      car_type: has_car ? car_type : null,
      license_plate: has_car ? license_plate : null,
      car_color: has_car ? car_color : null,
      photo_url: photo_url || null,
      is_active,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, username, full_name, phone_number, id_number, position, role,
        has_car, car_type, license_plate, car_color, photo_url,
        is_active, created_at
      `)
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ 
        error: 'שגיאה בעדכון המשתמש: ' + error.message,
        message: 'Failed to update user' 
      });
    }

    if (!updatedUser) {
      return res.status(404).json({ 
        error: 'המשתמש לא נמצא',
        message: 'User not found' 
      });
    }

    // Update associated vehicle if user has car information
    let vehicleData = null;
    try {
      vehicleData = await updateUserVehicle(updateData, id);
      if (vehicleData) {
        console.log(`✅ Vehicle updated for user ${updatedUser.full_name}`);
      }
    } catch (vehicleError) {
      console.error('Error updating vehicle for user:', vehicleError);
      // Note: We don't fail the user update if vehicle update fails
    }

    // Return user data with vehicle information if updated
    const response = {
      ...updatedUser,
      vehicle: vehicleData
    };

    res.json(response);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת',
      message: 'Server error' 
    });
  }
});

/**
 * Delete user
 */
router.delete('/:id', auth, requireSuperRole, async (req, res) => {
  try {
    const { id } = req.params;

    // Cannot delete admin user
    if (id === '1') {
      return res.status(403).json({ 
        error: 'לא ניתן למחוק את משתמש האדמין',
        message: 'Cannot delete admin user' 
      });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ 
        error: 'שגיאה במחיקת המשתמש',
        message: 'Failed to delete user' 
      });
    }

    res.json({ 
      message: 'המשתמש נמחק בהצלחה',
      success: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת',
      message: 'Server error' 
    });
  }
});

module.exports = router;
