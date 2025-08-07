const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

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

// Vehicle search route - accessible to all users (שאילתא)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;
    
    // Check if user can search vehicles (all users can)
    const canSearch = await checkVehicleSearchPermission(userId);
    if (!canSearch) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לחיפוש רכבים' 
      });
    }

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'נדרש מונח חיפוש של לפחות 2 תווים'
      });
    }

    const searchTerm = query.trim();
    
    // Search vehicles by license plate, owner name, or owner phone
    const { data: vehicles, error: searchError } = await supabaseAdmin
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
      `)
      .or(`license_plate.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,owner_phone.ilike.%${searchTerm}%`)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (searchError) {
      console.error('Error searching vehicles:', searchError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בחיפוש רכבים'
      });
    }

    res.json({
      success: true,
      data: vehicles || [],
      message: `נמצאו ${vehicles?.length || 0} רכבים`
    });

  } catch (error) {
    console.error('Error in vehicle search:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בחיפוש רכבים'
    });
  }
});

// Vehicle management routes - only for מפתח, אדמין, פיקוד יחידה

// GET all vehicles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user can manage vehicles (for admin panel)
    const canManage = await checkVehicleManagePermission(userId);
    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לצפייה בניהול רכבים - נדרש תפקיד מפתח/אדמין/פיקוד יחידה' 
      });
    }
    
    // Fetch all vehicles for management
    const { data: vehicles, error: fetchError } = await supabaseAdmin
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
      `)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching vehicles:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בטעינת רשימת רכבים'
      });
    }

    res.json({
      success: true,
      data: vehicles || [],
      message: `נטענו ${vehicles?.length || 0} רכבים`
    });

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת רכבים'
    });
  }
});

// POST new vehicle - only for managers
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user can manage vehicles
    const canManage = await checkVehicleManagePermission(userId);
    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים - נדרש תפקיד מפתח/אדמין/פיקוד יחידה' 
      });
    }

    const {
      license_plate,
      vehicle_type,
      vehicle_model,
      vehicle_color,
      owner_name,
      owner_address,
      owner_phone,
      vehicle_image_url,
      owner_image_url
    } = req.body;

    // Validate required fields
    if (!license_plate || !vehicle_type || !vehicle_model || !vehicle_color || !owner_name || !owner_address || !owner_phone) {
      return res.status(400).json({
        success: false,
        message: 'שדות חובה חסרים: מספר רכב, סוג רכב, דגם רכב, צבע רכב, שם בעלים, כתובת, טלפון'
      });
    }

    // Check if vehicle with this license plate already exists
    const { data: existingVehicle, error: checkError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('license_plate', license_plate)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing vehicle:', checkError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בבדיקת רכב קיים'
      });
    }

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'רכב עם מספר רישוי זה כבר קיים במערכת'
      });
    }

    // Insert new vehicle
    const { data: newVehicle, error: insertError } = await supabaseAdmin
      .from('vehicles')
      .insert({
        license_plate: license_plate.trim(),
        vehicle_type: vehicle_type.trim(),
        vehicle_model: vehicle_model.trim(),
        vehicle_color: vehicle_color.trim(),
        owner_name: owner_name.trim(),
        owner_address: owner_address.trim(),
        owner_phone: owner_phone.trim(),
        vehicle_image_url: vehicle_image_url || null,
        owner_image_url: owner_image_url || null,
        created_by_id: userId,
        updated_by_id: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting vehicle:', insertError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשמירת רכב במסד הנתונים'
      });
    }

    console.log('Vehicle created successfully:', newVehicle.id);
    res.json({
      success: true,
      message: 'רכב נוסף בהצלחה',
      data: newVehicle
    });

  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת רכב' 
    });
  }
});

// PUT update vehicle - only for managers
router.put('/:vehicleId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleId } = req.params;
    
    // Check if user can manage vehicles
    const canManage = await checkVehicleManagePermission(userId);
    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים - נדרש תפקיד מפתח/אדמין/פיקוד יחידה' 
      });
    }

    const {
      license_plate,
      vehicle_type,
      vehicle_model,
      vehicle_color,
      owner_name,
      owner_address,
      owner_phone,
      vehicle_image_url,
      owner_image_url
    } = req.body;

    // Validate required fields
    if (!license_plate || !vehicle_type || !vehicle_model || !vehicle_color || !owner_name || !owner_address || !owner_phone) {
      return res.status(400).json({
        success: false,
        message: 'שדות חובה חסרים: מספר רכב, סוג רכב, דגם רכב, צבע רכב, שם בעלים, כתובת, טלפון'
      });
    }

    // Check if vehicle exists
    const { data: existingVehicle, error: checkError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .single();

    if (checkError || !existingVehicle) {
      return res.status(404).json({
        success: false,
        message: 'רכב לא נמצא'
      });
    }

    // Check if license plate is being changed and if new one already exists
    const { data: plateConflict, error: plateError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('license_plate', license_plate)
      .neq('id', vehicleId)
      .single();

    if (plateError && plateError.code !== 'PGRST116') {
      console.error('Error checking plate conflict:', plateError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בבדיקת מספר רישוי'
      });
    }

    if (plateConflict) {
      return res.status(400).json({
        success: false,
        message: 'רכב אחר עם מספר רישוי זה כבר קיים במערכת'
      });
    }

    // Update vehicle
    const { data: updatedVehicle, error: updateError } = await supabaseAdmin
      .from('vehicles')
      .update({
        license_plate: license_plate.trim(),
        vehicle_type: vehicle_type.trim(),
        vehicle_model: vehicle_model.trim(),
        vehicle_color: vehicle_color.trim(),
        owner_name: owner_name.trim(),
        owner_address: owner_address.trim(),
        owner_phone: owner_phone.trim(),
        vehicle_image_url: vehicle_image_url || null,
        owner_image_url: owner_image_url || null,
        updated_by_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון רכב במסד הנתונים'
      });
    }

    console.log('Vehicle updated successfully:', vehicleId);
    res.json({
      success: true,
      message: 'רכב עודכן בהצלחה',
      data: updatedVehicle
    });

  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בעדכון רכב' 
    });
  }
});

// DELETE vehicle - only for managers
router.delete('/:vehicleId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicleId } = req.params;
    
    // Check if user can manage vehicles
    const canManage = await checkVehicleManagePermission(userId);
    if (!canManage) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לניהול רכבים - נדרש תפקיד מפתח/אדמין/פיקוד יחידה' 
      });
    }

    // Check if vehicle exists
    const { data: existingVehicle, error: checkError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate')
      .eq('id', vehicleId)
      .single();

    if (checkError || !existingVehicle) {
      return res.status(404).json({
        success: false,
        message: 'רכב לא נמצא'
      });
    }

    // Delete vehicle
    const { error: deleteError } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (deleteError) {
      console.error('Error deleting vehicle:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה במחיקת רכב מהמסד נתונים'
      });
    }

    console.log('Vehicle deleted successfully:', vehicleId);
    res.json({
      success: true,
      message: 'רכב נמחק בהצלחה',
      data: { id: vehicleId, license_plate: existingVehicle.license_plate }
    });

  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה במחיקת רכב' 
    });
  }
});

module.exports = router;
