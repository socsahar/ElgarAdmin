import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, LinearProgress, Alert, Snackbar } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { useSocket } from './contexts/SocketContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ForcePasswordChange from './components/ForcePasswordChange';
import ProtectedRoute from './components/ProtectedRoute';

// Import CSS
import './styles/components.css';
import './styles/mobile-enhancements.css';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard_NEW';
import Users from './pages/Users';
import EventManagement from './pages/EventManagement';
import ActionReports from './pages/ActionReports';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Volunteers from './pages/Volunteers';
import Statistics from './pages/Statistics';
import SystemMessages from './pages/SystemMessages';
import OutRecords from './pages/OutRecords';
import Summaries from './pages/Summaries';
import VehicleSearch from './pages/VehicleSearch';

// Basic Protected Route component for authentication-only protection
const AuthProtectedRoute = ({ children }) => {
  const { user, loading, updateUser } = useAuth();
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  
  useEffect(() => {
    if (user && user.mustChangePassword) {
      setShowForcePasswordChange(true);
    }
  }, [user]);

  const handlePasswordChanged = () => {
    setShowForcePasswordChange(false);
    // Update user to remove mustChangePassword flag
    updateUser({ mustChangePassword: false });
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Show force password change dialog if needed
  if (showForcePasswordChange) {
    return (
      <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
        <ForcePasswordChange 
          open={showForcePasswordChange}
          onPasswordChanged={handlePasswordChanged}
        />
      </Box>
    );
  }
  
  return children;
};

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { user, loading } = useAuth();
  const { connected, connecting } = useSocket();
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);

  // Monitor socket connection status
  useEffect(() => {
    if (user && !connected && !connecting) {
      setShowConnectionAlert(true);
    } else {
      setShowConnectionAlert(false);
    }
  }, [user, connected, connecting]);

  // Show initial loading spinner
  if (loading) {
    return <LoadingSpinner message="טוען מערכת אלגר..." />;
  }

  return (
    <PermissionsProvider>
      <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* Global loading bar for navigation */}
      {connecting && (
        <LinearProgress 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 9999 
          }} 
        />
      )}

      {/* Connection status alert */}
      <Snackbar
        open={showConnectionAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 2 }}
      >
        <Alert 
          severity="warning" 
          onClose={() => setShowConnectionAlert(false)}
          sx={{ direction: 'rtl' }}
        >
          החיבור לשרת נותק - מנסה להתחבר מחדש...
        </Alert>
      </Snackbar>

      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />

        {/* Protected routes with layout */}
        <Route 
          path="/" 
          element={
            <AuthProtectedRoute>
              <Layout />
            </AuthProtectedRoute>
          }
        >
          {/* Redirect root to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Main dashboard routes with permission protection */}
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute permission="view_dashboard_events">
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="users" 
            element={
              <ProtectedRoute permission="view_users_info">
                <Users />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="events" 
            element={
              <ProtectedRoute permission="view_events_list">
                <EventManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="action-reports" 
            element={
              <ProtectedRoute permission="manage_own_action_reports">
                <ActionReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="analytics" 
            element={
              <ProtectedRoute permission="access_analytics">
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="settings" 
            element={
              <ProtectedRoute permission="can_modify_privileges">
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="summaries" 
            element={
              <ProtectedRoute permission={["access_summaries", "view_own_summaries"]}>
                <Summaries />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="vehicle-search" 
            element={
              <ProtectedRoute permission={["vehicle_use_system", "vehicle_search_access"]}>
                <VehicleSearch />
              </ProtectedRoute>
            } 
          />
          <Route path="profile" element={<Profile />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="system-messages" element={<SystemMessages />} />
          <Route path="out-records" element={<OutRecords />} />
        </Route>

        {/* Catch all route - redirect to dashboard if logged in, otherwise to login */}
        <Route 
          path="*" 
          element={
            user ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </Box>
    </PermissionsProvider>
  );
}

export default App;
