/**
 * Main App Navigator
 * 
 * Handles navigation between authenticated and non-authenticated states
 * Routes users based on their authentication status and role
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Import screens
import ForcePasswordChangeScreen from '../screens/ForcePasswordChangeScreen';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // User not logged in - show auth flow
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user?.must_change_password ? (
        // User logged in but must change password
        <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} />
      ) : (
        // User authenticated and ready - show main app
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
