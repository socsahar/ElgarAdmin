/**
 * Authentication Navigator
 * 
 * Handles login flow before user enters main application
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import auth screens
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' }
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Loading" component={LoadingScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
