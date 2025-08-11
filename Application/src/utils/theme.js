/**
 * Hebrew RTL Theme Configuration
 * 
 * Material Design theme adapted for Hebrew RTL support
 */

import { MD3LightTheme } from 'react-native-paper';

export const hebrewTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2c3e50',
    primaryContainer: '#ecf0f1',
    secondary: '#3498db',
    secondaryContainer: '#e3f2fd',
    surface: '#ffffff',
    background: '#f8f9fa',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurface: '#2c3e50',
    onBackground: '#2c3e50',
    error: '#e74c3c',
    errorContainer: '#ffebee',
    onError: '#ffffff',
    outline: '#bdc3c7',
    surfaceVariant: '#f8f9fa',
  },
  fonts: {
    ...MD3LightTheme.fonts,
    // Hebrew font configuration will be added here
    default: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
  },
};

export const colors = {
  primary: '#2c3e50',
  secondary: '#3498db',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  light: '#ecf0f1',
  dark: '#2c3e50',
  
  // Status colors
  available: '#27ae60',
  unavailable: '#e74c3c',
  busy: '#f39c12',
  offline: '#95a5a6',
  
  // Text colors
  textPrimary: '#2c3e50',
  textSecondary: '#7f8c8d',
  textLight: '#bdc3c7',
  
  // Background colors
  background: '#f8f9fa',
  surface: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};
