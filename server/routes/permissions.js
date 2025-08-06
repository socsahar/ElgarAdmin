const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

// Role hierarchy mapping for validation
const ROLE_HIERARCHY = {
  'מפתח': ['אדמין', 'פיקוד יחידה', 'מפקד משל"ט', 'מוקדן', 'סייר'],
  'אדמין': ['פיקוד יחידה', 'מפקד משל"ט', 'מוקדן', 'סייר'],
  'פיקוד יחידה': ['מפקד משל"ט', 'מוקדן', 'סייר'],
  'מפקד משל"ט': ['מוקדן', 'סייר'],
  'מוקדן': [],
  'סייר': []
};

// Super roles that can modify privileges
const PRIVILEGE_MANAGERS = ['מפתח', 'אדמין', 'פיקוד יחידה'];

// Middleware to check if user can manage privileges
const requirePrivilegeManager = (req, res, next) => {
  if (!PRIVILEGE_MANAGERS.includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied. Only מפתח, אדמין, or פיקוד יחידה can modify privileges.' 
    });
  }
  next();
};

// Get user permissions
router.get('/permissions/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details and permissions
    const { data: userPermissions, error } = await supabaseAdmin
      .from('user_permissions')
      .select(`
        permission,
        is_active,
        granted_at,
        granted_by:granted_by_id(full_name, role)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    res.json({
      success: true,
      permissions: userPermissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ message: 'Error fetching permissions' });
  }
});

// Update user permissions
router.put('/permissions/:userId', authMiddleware, requirePrivilegeManager, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // Array of permission strings

    // Get target user to check role hierarchy
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, full_name')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Check if requesting user can manage target user
    const canManage = ROLE_HIERARCHY[req.user.role]?.includes(targetUser.role) || 
                     req.user.role === targetUser.role;
    
    if (!canManage && req.user.role !== 'מפתח') {
      return res.status(403).json({ 
        message: `Cannot modify permissions for ${targetUser.role} role` 
      });
    }

    // Remove all existing permissions for this user
    await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    // Add new permissions
    if (permissions && permissions.length > 0) {
      const permissionInserts = permissions.map(permission => ({
        user_id: userId,
        permission: permission,
        granted_by_id: req.user.id,
        is_active: true
      }));

      const { error: insertError } = await supabaseAdmin
        .from('user_permissions')
        .insert(permissionInserts);

      if (insertError) throw insertError;
    }

    res.json({
      success: true,
      message: `Permissions updated for ${targetUser.full_name}`,
      permissions: permissions
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ message: 'Error updating permissions' });
  }
});

// Get role hierarchy (what roles current user can manage)
router.get('/manageable-roles', authMiddleware, async (req, res) => {
  try {
    const manageableRoles = ROLE_HIERARCHY[req.user.role] || [];
    
    res.json({
      success: true,
      currentRole: req.user.role,
      manageableRoles: manageableRoles,
      canModifyPrivileges: PRIVILEGE_MANAGERS.includes(req.user.role)
    });
  } catch (error) {
    console.error('Error fetching manageable roles:', error);
    res.status(500).json({ message: 'Error fetching manageable roles' });
  }
});

// Get all available permissions
router.get('/available-permissions', authMiddleware, requirePrivilegeManager, async (req, res) => {
  try {
    const permissions = [
      {
        key: 'access_users_crud',
        label: 'ניהול משתמשים',
        description: 'יצירה, עריכה, שינוי ומחיקה של משתמשים'
      },
      {
        key: 'access_events_crud',
        label: 'ניהול אירועים',
        description: 'יצירה, עריכה, שינוי, הקצאה ומחיקה של אירועים'
      },
      {
        key: 'access_analytics',
        label: 'גישה לאנליטיקה',
        description: 'צפייה בדף האנליטיקה והדוחות'
      },
      {
        key: 'access_summaries',
        label: 'גישה לסיכומים',
        description: 'צפייה בדף הסיכומים והסטטיסטיקות'
      },
      {
        key: 'access_action_reports',
        label: 'בדיקת דוחות פעולה',
        description: 'צפייה ובדיקה של דוחות פעולה'
      },
      {
        key: 'can_modify_privileges',
        label: 'שינוי הרשאות',
        description: 'יכולת לשנות הרשאות למשתמשים אחרים'
      }
    ];

    res.json({
      success: true,
      permissions: permissions
    });
  } catch (error) {
    console.error('Error fetching available permissions:', error);
    res.status(500).json({ message: 'Error fetching available permissions' });
  }
});

// Check if user has specific permission
router.get('/check/:permission', authMiddleware, async (req, res) => {
  try {
    const { permission } = req.params;

    const { data: hasPermission, error } = await supabaseAdmin
      .from('user_permissions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('permission', permission)
      .eq('is_active', true)
      .single();

    res.json({
      success: true,
      hasPermission: !!hasPermission,
      permission: permission
    });
  } catch (error) {
    res.json({
      success: true,
      hasPermission: false,
      permission: req.params.permission
    });
  }
});

// Get role-based default permissions
router.get('/role-defaults/:role', authMiddleware, requirePrivilegeManager, async (req, res) => {
  try {
    const { role } = req.params;

    const { data: defaultPermissions, error } = await supabaseAdmin
      .from('role_default_permissions')
      .select('permission')
      .eq('role', role)
      .eq('is_default', true);

    if (error) throw error;

    res.json({
      success: true,
      role: role,
      defaultPermissions: defaultPermissions.map(p => p.permission)
    });
  } catch (error) {
    console.error('Error fetching role default permissions:', error);
    res.status(500).json({ message: 'Error fetching role defaults' });
  }
});

// Update role default permissions
router.put('/role-defaults/:role', authMiddleware, requirePrivilegeManager, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    // Check if requesting user can manage this role
    const canManage = ROLE_HIERARCHY[req.user.role]?.includes(role) || 
                     req.user.role === role;
    
    if (!canManage && req.user.role !== 'מפתח') {
      return res.status(403).json({ 
        message: `Cannot modify default permissions for ${role} role` 
      });
    }

    // Remove existing defaults for this role
    await supabaseAdmin
      .from('role_default_permissions')
      .delete()
      .eq('role', role);

    // Add new defaults
    if (permissions && permissions.length > 0) {
      const defaultInserts = permissions.map(permission => ({
        role: role,
        permission: permission,
        is_default: true
      }));

      const { error: insertError } = await supabaseAdmin
        .from('role_default_permissions')
        .insert(defaultInserts);

      if (insertError) throw insertError;
    }

    res.json({
      success: true,
      message: `Default permissions updated for ${role} role`,
      role: role,
      permissions: permissions
    });
  } catch (error) {
    console.error('Error updating role default permissions:', error);
    res.status(500).json({ message: 'Error updating role defaults' });
  }
});

module.exports = router;
