const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

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
    
    // Check if user can search vehicles (all users can)
    const canSearch = await checkVehicleSearchPermission(userId);
    if (!canSearch) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לחיפוש רכבים' 
      });
    }

    // Get user permissions to show UI capabilities
    const canManage = await checkVehicleManagePermission(userId);

    // Vehicle search logic goes here
    res.json({
      success: true,
      message: 'שאילתא - חיפוש רכבים זמין לכל המשתמשים',
      permissions: {
        canSearch: true,
        canManageVehicles: canManage,
        userRole: req.user.role
      }
    });

  } catch (error) {
    console.error('Error in vehicle search:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
    });
  }
});

// Vehicle management routes - only for מפתח, אדמין, פיקוד יחידה

// GET all vehicles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // All users can see vehicles for search, but only managers can see management interface
    const canManage = await checkVehicleManagePermission(userId);
    
    res.json({
      success: true,
      message: 'רשימת רכבים',
      permissions: {
        canSearch: true,
        canManageVehicles: canManage,
        userRole: req.user.role
      }
    });

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת פנימית' 
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

    // Vehicle creation logic goes here
    res.json({
      success: true,
      message: 'רכב נוסף בהצלחה'
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

    // Vehicle update logic goes here
    res.json({
      success: true,
      message: 'רכב עודכן בהצלחה'
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

    // Vehicle deletion logic goes here
    res.json({
      success: true,
      message: 'רכב נמחק בהצלחה'
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
