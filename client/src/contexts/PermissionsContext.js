import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manageableRoles, setManageableRoles] = useState([]);
  const [hasPrivilegeModifyAccess, setHasPrivilegeModifyAccess] = useState(false);

  // Load user permissions
  const loadUserPermissions = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/permissions/permissions/${user.id}`);
      if (response.data.success) {
        setPermissions(response.data.permissions.map(p => p.permission));
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadUserPermissions();
      loadManageableRoles();
    }
  }, [user?.id]);

  const loadManageableRoles = async () => {
    try {
      const response = await api.get('/api/permissions/manageable-roles');
      if (response.data.success) {
        setManageableRoles(response.data.manageableRoles);
        setHasPrivilegeModifyAccess(response.data.canModifyPrivileges);
      }
    } catch (error) {
      console.error('Error loading manageable roles:', error);
      setManageableRoles([]);
      setHasPrivilegeModifyAccess(false);
    }
  };

  // Permission checking functions
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => permissions.includes(permission));
  };

  // Role hierarchy checking
  const canManageRole = (targetRole) => {
    if (!user || !targetRole) return false;
    
    // Only מפתח and אדמין can edit מפתח role
    if (targetRole === 'מפתח') {
      return ['מפתח', 'אדמין'].includes(user.role);
    }
    
    // Only מפתח can edit אדמין role  
    if (targetRole === 'אדמין') {
      return user.role === 'מפתח';
    }
    
    return manageableRoles.includes(targetRole) || user.role === targetRole;
  };

  const canManageUser = (targetUser) => {
    // Check if current user exists
    if (!user || !targetUser) return false;
    
    // Only management roles can manage users - strict hierarchy
    if (user.role === 'מפתח') return true;
    if (user.role === 'אדמין' && targetUser.role !== 'מפתח') return true;
    if (user.role === 'פיקוד יחידה' && !['מפתח', 'אדמין'].includes(targetUser.role)) return true;
    
    // NO OTHER ROLES can manage users - remove the permissive fallback
    // סייר, מוקדן, מפקד משל"ט cannot manage ANY users
    return false;
  };

  // Permission shortcuts for common checks
  const canManageUsers = () => hasPermission('access_users_crud');
  const canManageEvents = () => hasPermission('access_events_crud');
  const canViewAnalytics = () => hasPermission('access_analytics');
  const canViewSummaries = () => hasPermission('access_summaries');
  const canInspectActionReports = () => hasPermission('access_action_reports');
  const canModifyPrivileges = () => hasPermission('can_modify_privileges');

  // Check if user is in super role
  const isSuperRole = () => {
    if (!user) return false;
    return ['מפתח', 'אדמין'].includes(user.role);
  };
  
  const isManagementRole = () => {
    if (!user) return false;
    return ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role);
  };

  // Get permission level for UI display
  const getPermissionLevel = () => {
    if (!user) return 'none';
    if (user.role === 'מפתח') return 'developer';
    if (user.role === 'אדמין') return 'admin';
    if (user.role === 'פיקוד יחידה') return 'unit_command';
    if (user.role === 'מפקד משל"ט') return 'controller';
    if (user.role === 'מוקדן') return 'dispatcher';
    return 'volunteer';
  };

  // Update permissions for a user (admin function)
  const updateUserPermissions = async (userId, newPermissions) => {
    try {
      const response = await api.put(`/api/permissions/permissions/${userId}`, {
        permissions: newPermissions
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw error;
    }
  };

  // Get available permissions list
  const getAvailablePermissions = async () => {
    try {
      const response = await api.get('/api/permissions/available-permissions');
      return response.data.permissions;
    } catch (error) {
      console.error('Error fetching available permissions:', error);
      return [];
    }
  };

  // Get role default permissions
  const getRoleDefaults = async (role) => {
    try {
      const response = await api.get(`/api/permissions/role-defaults/${role}`);
      return response.data.defaultPermissions;
    } catch (error) {
      console.error('Error fetching role defaults:', error);
      return [];
    }
  };

  const value = {
    // State
    permissions,
    loading,
    manageableRoles,
    hasPrivilegeModifyAccess,

    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Role management
    canManageRole,
    canManageUser,

    // Permission shortcuts
    canManageUsers,
    canManageEvents,
    canViewAnalytics,
    canViewSummaries,
    canInspectActionReports,
    canModifyPrivileges,

    // Role checks
    isSuperRole,
    isManagementRole,
    getPermissionLevel,

    // Actions
    updateUserPermissions,
    getAvailablePermissions,
    getRoleDefaults,
    loadUserPermissions
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};
