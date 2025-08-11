/**
 * Authentication Context for Mobile Application
 * 
 * Uses SAME authentication system as website:
 * - Username-based login (no email)
 * - JWT tokens with AsyncStorage persistence
 * - Force password change system
 * - Role-based access control
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useSupabase } from './SupabaseContext';

// Server configuration - SAME as website
const SERVER_URL = 'http://localhost:5000';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updatePassword: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { supabase } = useSupabase();

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.baseURL = SERVER_URL;
    axios.defaults.timeout = 10000;
  }, []);

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (token) {
        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token with server (same endpoint as website)
        const response = await axios.get('/api/auth/me');
        
        if (response.data && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          console.log('✅ Session restored for user:', response.data.user.username);
        } else {
          // Invalid token, clear it
          await logout();
        }
      }
    } catch (error) {
      console.error('❌ Session check error:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login for:', username);
      
      // Use same login endpoint as website
      const response = await axios.post('/api/auth/login', {
        username: username.trim(),
        password: password,
      });

      if (response.data && response.data.token && response.data.user) {
        const { token, user: userData } = response.data;
        
        // Store token
        await AsyncStorage.setItem('authToken', token);
        
        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update state
        setUser(userData);
        setIsAuthenticated(true);
        
        console.log('✅ Login successful for:', userData.username, 'Role:', userData.role);
        
        return {
          success: true,
          user: userData,
          mustChangePassword: userData.must_change_password,
        };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'שגיאה בהתחברות';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMessage = 'בעיית חיבור לשרת';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
    try {
      // Clear stored token
      await AsyncStorage.removeItem('authToken');
      
      // Clear axios headers
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear state
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('👋 User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      // Use same password change endpoint as website
      const response = await axios.post('/api/auth/change-password', {
        newPassword: newPassword,
      });

      if (response.data && response.data.user) {
        // Update user state to reflect password change
        setUser(response.data.user);
        
        console.log('✅ Password updated successfully');
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Password update error:', error);
      
      let errorMessage = 'שגיאה בעדכון סיסמה';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Use same user update endpoint as website
      const response = await axios.put(`/api/admin/users/${user.id}`, profileData);

      if (response.data && response.data.user) {
        // Update user state
        setUser(response.data.user);
        
        console.log('✅ Profile updated successfully');
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Profile update error:', error);
      
      let errorMessage = 'שגיאה בעדכון פרופיל';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updatePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
