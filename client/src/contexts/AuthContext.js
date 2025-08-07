import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api'; // Use the configured API instance

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
      api.get('/auth/me')
        .then(response => {
          setUser(response.data.user);
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
    try {
      console.log('AuthContext: Making login request to backend API');
      const response = await api.post('/auth/login', { username, password });
      console.log('AuthContext: Login response:', response.data);
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
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
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
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
