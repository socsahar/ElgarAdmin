import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';

/**
 * Protected Route Component - Only allows access if user has required permission
 * @param {Object} props - Component props
 * @param {React.Component} props.children - Child components to render if authorized
 * @param {string|string[]} props.permission - Required permission(s) to access the route (string or array)
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: /dashboard)
 * @returns {React.Component} - Authorized content or redirect
 */
const ProtectedRoute = ({ children, permission, redirectTo = '/dashboard' }) => {
  const { user } = useAuth();
  const { hasPermission, loading } = usePermissions();

  // If user is not logged in, redirect to login (handled by App.js)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If permissions are still loading, show nothing (or a loading spinner)
  if (loading) {
    return null; // or <LoadingSpinner />
  }

  // Check permissions - if permission is an array, user needs at least one of them
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAnyPermission = permissions.some(perm => hasPermission(perm));
    
    if (!hasAnyPermission) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // User has permission, render the protected content
  return children;
};

export default ProtectedRoute;
