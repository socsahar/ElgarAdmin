/**
 * Utility functions for the application
 */

import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Format date in Hebrew locale
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return dateObj.toLocaleDateString('he-IL', defaultOptions);
};

/**
 * Format time relative to now (e.g., "5 minutes ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - dateObj.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return 'עכשיו';
  } else if (minutes < 60) {
    return `לפני ${minutes} דקות`;
  } else if (hours < 24) {
    return `לפני ${hours} שעות`;
  } else {
    return `לפני ${days} ימים`;
  }
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format Israeli phone numbers
  if (digits.startsWith('972')) {
    // International format
    const local = digits.substring(3);
    if (local.length === 9) {
      return `+972-${local.substring(0, 2)}-${local.substring(2, 5)}-${local.substring(5)}`;
    }
  } else if (digits.length === 10 && digits.startsWith('0')) {
    // Local format
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  return phone;
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Israeli phone number
 */
export const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  
  // Check for Israeli mobile numbers (050, 052, 053, 054, 055, 058)
  const mobileRegex = /^05[0|2|3|4|5|8]\d{7}$/;
  
  // Check for landline numbers
  const landlineRegex = /^0[2-4|8|9]\d{7,8}$/;
  
  return mobileRegex.test(digits) || landlineRegex.test(digits);
};

/**
 * Generate a random ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Storage utilities
 */
export const storage = {
  async set(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },

  async get(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

/**
 * Network utilities
 */
export const network = {
  /**
   * Check if response is successful
   */
  isResponseOk(response) {
    return response && response.status >= 200 && response.status < 300;
  },

  /**
   * Handle API errors
   */
  handleApiError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      switch (status) {
        case 401:
          return 'אין הרשאה - התחבר מחדש';
        case 403:
          return 'אין הרשאה לפעולה זו';
        case 404:
          return 'הפריט לא נמצא';
        case 500:
          return 'שגיאת שרת - נסה שוב מאוחר יותר';
        default:
          return message || 'שגיאה לא ידועה';
      }
    } else if (error.request) {
      // Network error
      return 'שגיאת רשת - בדוק את החיבור לאינטרנט';
    } else {
      // Other error
      return error.message || 'שגיאה לא ידועה';
    }
  },
};

/**
 * RTL utilities
 */
export const rtl = {
  /**
   * Check if RTL is enabled
   */
  isRTL() {
    return I18nManager.isRTL;
  },

  /**
   * Force RTL layout
   */
  forceRTL() {
    I18nManager.forceRTL(true);
  },

  /**
   * Force LTR layout
   */
  forceLTR() {
    I18nManager.forceRTL(false);
  },

  /**
   * Get text alignment based on RTL
   */
  getTextAlign() {
    return I18nManager.isRTL ? 'right' : 'left';
  },

  /**
   * Get flex direction based on RTL
   */
  getFlexDirection() {
    return I18nManager.isRTL ? 'row-reverse' : 'row';
  },
};

/**
 * Permission utilities
 */
export const permissions = {
  /**
   * Check if user has permission
   */
  hasPermission(userRole, requiredPermission) {
    const rolePermissions = {
      admin: ['all'],
      sayer: ['view_events', 'update_events', 'create_reports'],
      volunteer: ['view_events', 'update_availability'],
      dispatcher: ['view_events', 'assign_events', 'create_events'],
      supervisor: ['view_events', 'view_reports', 'view_users'],
    };

    const userPermissions = rolePermissions[userRole] || [];
    
    return userPermissions.includes('all') || userPermissions.includes(requiredPermission);
  },

  /**
   * Check if user can access screen
   */
  canAccessScreen(userRole, screenName) {
    const screenPermissions = {
      Dashboard: ['admin', 'sayer', 'volunteer', 'dispatcher', 'supervisor'],
      Events: ['admin', 'sayer', 'volunteer', 'dispatcher', 'supervisor'],
      ActionReports: ['admin', 'sayer', 'supervisor'],
      Profile: ['admin', 'sayer', 'volunteer', 'dispatcher', 'supervisor'],
      Users: ['admin'],
      Settings: ['admin', 'sayer', 'volunteer', 'dispatcher', 'supervisor'],
    };

    const allowedRoles = screenPermissions[screenName] || [];
    return allowedRoles.includes(userRole);
  },
};

/**
 * Location utilities
 */
export const location = {
  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  },

  /**
   * Format coordinates for display
   */
  formatCoordinates(latitude, longitude) {
    if (!latitude || !longitude) return '';
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  },

  /**
   * Get address from coordinates (placeholder - requires geocoding service)
   */
  async getAddressFromCoordinates(latitude, longitude) {
    // This would integrate with a geocoding service
    // For now, return formatted coordinates
    return this.formatCoordinates(latitude, longitude);
  },
};

/**
 * Validation utilities
 */
export const validation = {
  /**
   * Validate required field
   */
  required(value) {
    return value !== null && value !== undefined && value.toString().trim().length > 0;
  },

  /**
   * Validate minimum length
   */
  minLength(value, min) {
    return value && value.toString().length >= min;
  },

  /**
   * Validate maximum length
   */
  maxLength(value, max) {
    return !value || value.toString().length <= max;
  },

  /**
   * Validate numeric value
   */
  isNumeric(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
  },

  /**
   * Validate Israeli ID number
   */
  validateIsraeliId(id) {
    if (!id || id.length !== 9) return false;
    
    const digits = id.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      sum += digit;
    }
    
    return sum % 10 === 0;
  },
};
