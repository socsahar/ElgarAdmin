const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG and PNG are allowed.'));
    }
  }
});

// Helper function to check vehicle management permissions (add/edit/delete)
const checkVehicleManagePermission = async (userId) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    // Only מפתח, אדמין, פיקוד יחידה can manage vehicles
    return ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role);
  } catch (error) {
    console.error('Error in permission check:', error);
    return false;
  }
};

// Helper function to check vehicle search permissions (all users can search)
const checkVehicleSearchPermission = async (userId) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    // All active users can search vehicles
    return true;
  } catch (error) {
    console.error('Error in permission check:', error);
    return false;
  }
};

// Helper function to check vehicle permissions management (simplified role-based)
const checkVehiclePermissionsManagePermission = async (userId) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    // Allow מפתח, אדמין, פיקוד יחידה to manage vehicle permissions
    return ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role);
  } catch (error) {
    console.error('Error in permission check:', error);
    return false;
  }
};

// Helper function to check vehicle permissions delegation capability (simplified role-based)
const checkVehicleDelegatePermission = async (userId) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    // Allow מפתח, אדמין, פיקוד יחידה to delegate vehicle permissions
    return ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role);
  } catch (error) {
    console.error('Error in permission check:', error);
    return false;
  }
};

// GET /api/vehicles/permissions/users - Get users for vehicle permission management
router.get('/permissions/users', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check delegation permissions
    const canDelegate = await checkVehicleDelegatePermission(userId);
    if (!canDelegate) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה למתן הרשאות רכבים' 
      });
    }

    // Get all users first (without permissions join to avoid relationship issues)
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        username,
        full_name,
        role,
        is_active
      `)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בטעינת רשימת משתמשים' 
      });
    }

    // Get vehicle permissions for all users in a separate query (simplified role-based)
    // No need to query individual permissions - just use roles
    
    // Format the data to include vehicle permissions status based on roles
    const usersWithVehiclePermissions = users.map(user => {
      // Vehicle access is based on role: מפתח, אדמין, פיקוד יחידה
      const hasVehicleAccess = ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role);

      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        vehicle_permissions: hasVehicleAccess ? ['vehicle_search_access', 'vehicle_manage_permissions', 'vehicle_delegate_permissions'] : [],
        has_vehicle_search: hasVehicleAccess,
        has_vehicle_manage: hasVehicleAccess,
        has_vehicle_delegate: hasVehicleAccess,
        access_source: hasVehicleAccess ? 'role_based' : 'no_access'
      };
    });

    res.json({
      success: true,
      data: usersWithVehiclePermissions
    });

  } catch (error) {
    console.error('Error in get users for permissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// POST /api/vehicles/permissions/grant - Grant vehicle permission to user (simplified role-based)
router.post('/permissions/grant', authMiddleware, async (req, res) => {
  try {
    const granterId = req.user.id;
    const { userId, permission } = req.body;
    
    // Check if granter has delegation permissions (role-based)
    const canDelegate = await checkVehicleDelegatePermission(granterId);
    if (!canDelegate) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה למתן הרשאות רכבים - נדרש תפקיד מפתח/אדמין/פיקוד יחידה' 
      });
    }

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'נדרש מזהה משתמש' 
      });
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'משתמש לא נמצא' 
      });
    }

    // For simplified role-based system, vehicle access is determined by role
    const hasVehicleAccess = ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(targetUser.role);
    
    res.json({
      success: true,
      message: hasVehicleAccess 
        ? `${targetUser.full_name} כבר בעל הרשאות רכבים (תפקיד: ${targetUser.role})`
        : `${targetUser.full_name} זקוק לשינוי תפקיד למפתח/אדמין/פיקוד יחידה כדי לקבל הרשאות רכבים`,
      data: {
        user: targetUser,
        hasVehicleAccess: hasVehicleAccess,
        accessReason: hasVehicleAccess ? 'role_based' : 'insufficient_role'
      }
    });

  } catch (error) {
    console.error('Error in grant permission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// DELETE /api/vehicles/permissions/revoke - Revoke vehicle permission from user
router.delete('/permissions/revoke', authMiddleware, async (req, res) => {
  try {
    const revokerId = req.user.id;
    const { userId, permission } = req.body;
    
    // Check delegation permissions
    const canDelegate = await checkVehicleDelegatePermission(revokerId);
    if (!canDelegate) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה למתן הרשאות רכבים' 
      });
    }

    // Validate permission type
    const validPermissions = ['vehicle_search_access', 'vehicle_manage_permissions'];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({ 
        success: false, 
        message: 'סוג הרשאה לא תקין' 
      });
    }

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'נדרש מזהה משתמש' 
      });
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'משתמש לא נמצא' 
      });
    }

    // For simplified role-based system, inform about role change requirement
    const hasVehicleAccess = ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(targetUser.role);
    
    res.json({
      success: true,
      message: hasVehicleAccess 
        ? `כדי לבטל הרשאות רכבים של ${targetUser.full_name}, יש לשנות את התפקיד (כרגע: ${targetUser.role})`
        : `${targetUser.full_name} כבר ללא הרשאות רכבים (תפקיד: ${targetUser.role})`,
      data: {
        user: targetUser,
        hasVehicleAccess: hasVehicleAccess,
        actionRequired: hasVehicleAccess ? 'change_role' : 'no_action_needed'
      }
    });

  } catch (error) {
    console.error('Error in revoke permission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// Helper function to sanitize filename for Supabase Storage
const sanitizeFileName = (originalName) => {
  // Extract file extension
  const ext = path.extname(originalName).toLowerCase();
  
  // Remove Hebrew characters, special characters, and spaces
  // Keep only ASCII letters, numbers, hyphens, underscores, and dots
  const sanitized = originalName
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters (Hebrew, etc.)
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters except dots, underscores, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase();
  
  // If the sanitized name is empty or just the extension, use a default name
  if (!sanitized || sanitized === ext || sanitized.length < 3) {
    return `file${ext}`;
  }
  
  return sanitized;
};

// Helper function to upload image to Supabase Storage
const uploadImageToSupabase = async (file, fileName) => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('vehicle-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('vehicle-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImageToSupabase:', error);
    throw error;
  }
};

// GET /api/vehicles/search - Search vehicles by any field
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check search permissions
    const hasUseAccess = await checkVehicleUsePermission(userId);
    if (!hasUseAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לחיפוש רכבים' 
      });
    }

    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'נדרש מונח חיפוש' 
      });
    }

    // Search across all relevant fields
    let searchQuery = supabaseAdmin
      .from('vehicles')
      .select(`
        id,
        license_plate,
        vehicle_type,
        vehicle_model,
        vehicle_color,
        owner_name,
        owner_address,
        owner_phone,
        vehicle_image_url,
        owner_image_url,
        created_at,
        updated_at
      `);

    // Use multiple OR conditions for flexible search
    const searchTerm = query.trim();
    searchQuery = searchQuery.or(`license_plate.ilike.%${searchTerm}%,vehicle_type.ilike.%${searchTerm}%,vehicle_model.ilike.%${searchTerm}%,vehicle_color.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,owner_address.ilike.%${searchTerm}%,owner_phone.ilike.%${searchTerm}%`);

    const { data: vehicles, error } = await searchQuery
      .order('created_at', { ascending: false })
      .limit(50); // Limit results to prevent performance issues

    if (error) {
      console.error('Error searching vehicles:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בחיפוש רכבים' 
      });
    }

    res.json({
      success: true,
      data: vehicles || [],
      count: vehicles ? vehicles.length : 0,
      searchTerm: searchTerm
    });

  } catch (error) {
    console.error('Error in vehicle search:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// GET /api/vehicles - Get all vehicles (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check admin permissions
    const hasManageAccess = await checkVehicleManagePermission(userId);
    if (!hasManageAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים' 
      });
    }

    const { data: vehicles, error } = await supabaseAdmin
      .from('vehicles')
      .select(`
        id,
        license_plate,
        vehicle_type,
        vehicle_model,
        vehicle_color,
        owner_name,
        owner_address,
        owner_phone,
        vehicle_image_url,
        owner_image_url,
        created_at,
        updated_at,
        created_by:created_by_id(full_name),
        updated_by:updated_by_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בטעינת רשימת רכבים' 
      });
    }

    res.json({
      success: true,
      data: vehicles || []
    });

  } catch (error) {
    console.error('Error in get vehicles:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// POST /api/vehicles - Create new vehicle (admin only)
router.post('/', authMiddleware, upload.fields([
  { name: 'vehicleImage', maxCount: 1 },
  { name: 'ownerImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check admin permissions
    const hasManageAccess = await checkVehicleManagePermission(userId);
    if (!hasManageAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים' 
      });
    }

    const {
      licensePlate,
      vehicleType,
      vehicleModel,
      vehicleColor,
      ownerName,
      ownerAddress,
      ownerPhone
    } = req.body;

    // Validate required fields
    if (!licensePlate || !vehicleType || !vehicleModel || !vehicleColor || 
        !ownerName || !ownerAddress || !ownerPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'כל השדות הנדרשים חייבים להיות מלאים' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$/;
    if (!phoneRegex.test(ownerPhone)) {
      return res.status(400).json({ 
        success: false, 
        message: 'פורמט מספר טלפון לא תקין' 
      });
    }

    let vehicleImageUrl = null;
    let ownerImageUrl = null;

    // Upload vehicle image if provided
    if (req.files && req.files.vehicleImage) {
      const vehicleImageFile = req.files.vehicleImage[0];
      const sanitizedVehicleName = sanitizeFileName(vehicleImageFile.originalname);
      const vehicleImageName = `vehicle-${Date.now()}-${sanitizedVehicleName}`;
      vehicleImageUrl = await uploadImageToSupabase(vehicleImageFile, vehicleImageName);
    }

    // Upload owner image if provided
    if (req.files && req.files.ownerImage) {
      const ownerImageFile = req.files.ownerImage[0];
      const sanitizedOwnerName = sanitizeFileName(ownerImageFile.originalname);
      const ownerImageName = `owner-${Date.now()}-${sanitizedOwnerName}`;
      ownerImageUrl = await uploadImageToSupabase(ownerImageFile, ownerImageName);
    }

    // Create vehicle record
    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .insert({
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        vehicle_color: vehicleColor,
        owner_name: ownerName,
        owner_address: ownerAddress,
        owner_phone: ownerPhone,
        vehicle_image_url: vehicleImageUrl,
        owner_image_url: ownerImageUrl,
        created_by_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ 
          success: false, 
          message: 'מספר רכב זה כבר קיים במערכת' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה ביצירת רכב חדש' 
      });
    }

    res.status(201).json({
      success: true,
      data: vehicle,
      message: 'רכב נוסף בהצלחה'
    });

  } catch (error) {
    console.error('Error in create vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// PUT /api/vehicles/:id - Update vehicle (admin only)
router.put('/:id', authMiddleware, upload.fields([
  { name: 'vehicleImage', maxCount: 1 },
  { name: 'ownerImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    
    // Check admin permissions
    const hasManageAccess = await checkVehicleManagePermission(userId);
    if (!hasManageAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים' 
      });
    }

    const {
      licensePlate,
      vehicleType,
      vehicleModel,
      vehicleColor,
      ownerName,
      ownerAddress,
      ownerPhone
    } = req.body;

    // Validate required fields
    if (!licensePlate || !vehicleType || !vehicleModel || !vehicleColor || 
        !ownerName || !ownerAddress || !ownerPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'כל השדות הנדרשים חייבים להיות מלאים' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$/;
    if (!phoneRegex.test(ownerPhone)) {
      return res.status(400).json({ 
        success: false, 
        message: 'פורמט מספר טלפון לא תקין' 
      });
    }

    // Get current vehicle data
    const { data: currentVehicle, error: fetchError } = await supabaseAdmin
      .from('vehicles')
      .select('vehicle_image_url, owner_image_url')
      .eq('id', vehicleId)
      .single();

    if (fetchError) {
      return res.status(404).json({ 
        success: false, 
        message: 'רכב לא נמצא' 
      });
    }

    let vehicleImageUrl = currentVehicle.vehicle_image_url;
    let ownerImageUrl = currentVehicle.owner_image_url;

    // Upload new vehicle image if provided
    if (req.files && req.files.vehicleImage) {
      const vehicleImageFile = req.files.vehicleImage[0];
      const sanitizedVehicleName = sanitizeFileName(vehicleImageFile.originalname);
      const vehicleImageName = `vehicle-${Date.now()}-${sanitizedVehicleName}`;
      vehicleImageUrl = await uploadImageToSupabase(vehicleImageFile, vehicleImageName);
    }

    // Upload new owner image if provided
    if (req.files && req.files.ownerImage) {
      const ownerImageFile = req.files.ownerImage[0];
      const sanitizedOwnerName = sanitizeFileName(ownerImageFile.originalname);
      const ownerImageName = `owner-${Date.now()}-${sanitizedOwnerName}`;
      ownerImageUrl = await uploadImageToSupabase(ownerImageFile, ownerImageName);
    }

    // Update vehicle record
    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .update({
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        vehicle_color: vehicleColor,
        owner_name: ownerName,
        owner_address: ownerAddress,
        owner_phone: ownerPhone,
        vehicle_image_url: vehicleImageUrl,
        owner_image_url: ownerImageUrl,
        updated_by_id: userId
      })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ 
          success: false, 
          message: 'מספר רכב זה כבר קיים במערכת' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה בעדכון רכב' 
      });
    }

    res.json({
      success: true,
      data: vehicle,
      message: 'רכב עודכן בהצלחה'
    });

  } catch (error) {
    console.error('Error in update vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    
    // Check admin permissions
    const hasManageAccess = await checkVehicleManagePermission(userId);
    if (!hasManageAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים' 
      });
    }

    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting vehicle:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה במחיקת רכב' 
      });
    }

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'רכב לא נמצא' 
      });
    }

    res.json({
      success: true,
      message: 'רכב נמחק בהצלחה'
    });

  } catch (error) {
    console.error('Error in delete vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// GET /api/vehicles/:id - Get single vehicle (admin only)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    
    // Check admin permissions
    const hasManageAccess = await checkVehicleManagePermission(userId);
    if (!hasManageAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים' 
      });
    }

    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .select(`
        id,
        license_plate,
        vehicle_type,
        vehicle_model,
        vehicle_color,
        owner_name,
        owner_address,
        owner_phone,
        vehicle_image_url,
        owner_image_url,
        created_at,
        updated_at,
        created_by:created_by_id(full_name),
        updated_by:updated_by_id(full_name)
      `)
      .eq('id', vehicleId)
      .single();

    if (error) {
      console.error('Error fetching vehicle:', error);
      return res.status(404).json({ 
        success: false, 
        message: 'רכב לא נמצא' 
      });
    }

    res.json({
      success: true,
      data: vehicle
    });

  } catch (error) {
    console.error('Error in get vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

module.exports = router;
