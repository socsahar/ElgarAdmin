// Permission utility functions for role-based access control

/**
 * Check if user has specific permission
 * @param {Object} user - User object with role and permissions
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has the permission
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  
  // Super roles have all permissions
  const superRoles = ['מפתח', 'אדמין', 'admin'];
  if (superRoles.includes(user.role)) return true;
  
  // Check specific permissions (would be loaded from database)
  // For now, check based on role until we implement full permission loading
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions.includes(permission);
};

/**
 * Get default permissions for a role
 * @param {string} role - User role
 * @returns {Array} - Array of permissions for the role
 */
export const getRolePermissions = (role) => {
  const permissions = {
    'מפתח': ['*'], // All permissions
    'אדמין': ['*'], // All permissions
    'admin': ['*'], // All permissions (legacy)
    'פיקוד יחידה': [
      'access_users_crud',
      'access_events_crud',
      'access_events_delete',
      'access_analytics',
      'access_summaries',
      'access_action_reports',
      'can_modify_privileges',
      'can_connect_to_website',
      'גישה לאתר',
      'view_dashboard_events',
      'view_events_list',
      'view_users_info',
      'manage_own_action_reports'
    ],
    'מפקד משל"ט': [
      'access_events_crud',
      'access_events_delete',
      'access_analytics',
      'access_summaries',
      'access_action_reports',
      'can_connect_to_website',
      'גישה לאתר',
      'view_dashboard_events',
      'view_events_list',
      'view_users_info',
      'manage_own_action_reports'
    ],
    'מוקדן': [
      'access_events_crud',
      'can_connect_to_website',
      'גישה לאתר',
      'view_dashboard_events',
      'view_events_list',
      'view_users_info',
      'manage_own_action_reports'
    ],
    'סייר': [
      'גישה לאתר',
      'can_connect_to_website',
      'view_dashboard_events',
      'view_users_info',
      'manage_own_action_reports'
    ]
  };
  
  return permissions[role] || [];
};

/**
 * Check if user can access a specific page
 * @param {Object} user - User object
 * @param {string} page - Page name
 * @returns {boolean} - Whether user can access the page
 */
export const canAccessPage = (user, page) => {
  if (!user) return false;
  
  const pagePermissions = {
    'dashboard': ['view_dashboard_events'],
    'users': ['view_users_info', 'access_users_crud'],
    'events': ['view_events_list', 'access_events_crud'],
    'analytics': ['access_analytics'],
    'action-reports': ['manage_own_action_reports', 'access_action_reports'],
    'summaries': ['view_own_summaries', 'access_summaries'],
    'settings': ['can_modify_privileges']
  };
  
  const requiredPermissions = pagePermissions[page] || [];
  
  // User needs at least one of the required permissions
  return requiredPermissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has admin/super role access
 * @param {Object} user - User object
 * @returns {boolean} - Whether user is admin/super role
 */
export const isSuperRole = (user) => {
  if (!user) return false;
  const superRoles = ['מפתח', 'אדמין', 'admin'];
  return superRoles.includes(user.role);
};

/**
 * Check if user can manage other users
 * @param {Object} user - User object
 * @returns {boolean} - Whether user can manage users
 */
export const canManageUsers = (user) => {
  return hasPermission(user, 'access_users_crud');
};

/**
 * Check if user can manage events
 * @param {Object} user - User object
 * @returns {boolean} - Whether user can manage events
 */
export const canManageEvents = (user) => {
  return hasPermission(user, 'access_events_crud');
};

/**
 * Check if user can delete events
 * @param {Object} user - User object
 * @returns {boolean} - Whether user can delete events
 */
export const canDeleteEvents = (user) => {
  return hasPermission(user, 'access_events_delete');
};

/**
 * Check if user can access analytics
 * @param {Object} user - User object
 * @returns {boolean} - Whether user can access analytics
 */
export const canAccessAnalytics = (user) => {
  return hasPermission(user, 'access_analytics');
};

/**
 * Get filtered navigation items based on user permissions
 * @param {Object} user - User object
 * @returns {Array} - Filtered navigation items
 */
export const getFilteredNavigation = (user) => {
  if (!user) return [];
  
  const allNavigationItems = [
    { text: 'לוח בקרה', path: '/dashboard', permission: 'view_dashboard_events' },
    { text: 'משתמשים', path: '/users', permission: 'view_users_info' },
    { text: 'אירועים', path: '/events', permission: 'view_events_list' },
    { text: 'אנליטיקה', path: '/analytics', permission: 'access_analytics' },
    { text: 'דוחות פעולה', path: '/action-reports', permission: 'manage_own_action_reports' },
    { text: 'סיכומים', path: '/summaries', permission: 'access_summaries' },
    { text: 'הגדרות', path: '/settings', permission: 'can_modify_privileges' }
  ];
  
  return allNavigationItems.filter(item => hasPermission(user, item.permission));
};
