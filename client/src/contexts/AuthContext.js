import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api'; // Use the configured API instance
import locationService from '../services/locationService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      api.get('/api/auth/me')
        .then(response => {
          setUser(response.data.user);
          
          // Start location tracking for valid logged-in users
          try {
            if (locationService.isSupported()) {
              locationService.requestPermission()
                .then(() => {
                  locationService.startTracking();
                  console.log('Location tracking started on app load');
                })
                .catch(error => {
                  console.log('Location permission denied on app load:', error.message);
                });
            }
          } catch (error) {
            console.log('Location service error on app load:', error);
          }
        })
        .catch(() => {
          // Token is invalid
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true); // Show loading during login
    try {
      const response = await api.post('/api/auth/login', { username, password });
      console.log('AuthContext: Login response:', response.data);
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      // Start location tracking for logged-in users
      try {
        if (locationService.isSupported()) {
          await locationService.requestPermission();
          locationService.startTracking();
          console.log('Location tracking started for user');
        } else {
          console.log('Location tracking not supported');
        }
      } catch (locationError) {
        console.log('Location permission denied or error:', locationError.message);
        // Don't fail login if location is denied
      }
      
      // Check if user must change password
      if (userData.mustChangePassword) {
        return { success: true, mustChangePassword: true };
      }
      
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      console.error('AuthContext: Error response:', error.response?.data);
      
      // Hebrew error messages
      let message = 'שגיאה בהתחברות';
      
      if (error.response?.status === 401) {
        message = 'שם משתמש או סיסמה שגויים';
      } else if (error.response?.status === 403) {
        message = 'אין לך הרשאה להתחבר למערכת';
      } else if (error.response?.status >= 500) {
        message = 'שגיאה בשרת. נסה שוב מאוחר יותר';
      } else if (!error.response) {
        message = 'בעיית חיבור לשרת. בדוק את החיבור לאינטרנט';
      }
      
      throw new Error(message);
    } finally {
      setLoading(false); // Hide loading after login attempt
    }
  };

  const logout = async () => {
    setLoading(true); // Show loading during logout
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with logout even if API call fails
    } finally {
      // Stop location tracking
      locationService.stopTracking();
      
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false); // Hide loading after logout
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  // Hebrew role checking functions
  const isAdmin = user?.role === 'אדמין' || user?.role === 'מפתח';
  const isSuperRole = user?.role === 'אדמין' || user?.role === 'מפתח' || user?.role === 'פיקוד יחידה';
  const isDispatchRole = user?.role === 'מפקד משל"ט' || user?.role === 'מוקדן';
  const isPatrol = user?.role === 'סייר';

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    // Hebrew role permissions
    isAdmin,
    isSuperRole,
    isDispatchRole,
    isPatrol,
    // Legacy compatibility
    isDispatcher: isDispatchRole || isSuperRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
