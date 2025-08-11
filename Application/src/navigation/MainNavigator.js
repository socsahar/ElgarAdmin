/**
 * Main Navigator
 * 
 * Bottom tab navigation for authenticated users
 * Different tabs based on user role (סייר vs אדמין)
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

// Import main screens
import DashboardScreen from '../screens/DashboardScreen';
import EventsScreen from '../screens/EventsScreen';
import ActionReportsScreen from '../screens/ActionReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UsersScreen from '../screens/UsersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  const { user } = useAuth();
  
  // Check if user has admin privileges
  const isAdmin = user?.role === 'אדמין' || user?.role === 'מפתח' || user?.role === 'פיקוד יחידה';
  const isController = user?.role === 'מפקד משל"ט' || isAdmin;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Events':
              iconName = 'event';
              break;
            case 'ActionReports':
              iconName = 'assignment';
              break;
            case 'Users':
              iconName = 'people';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2c3e50',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
      })}
    >
      {/* Dashboard - Available to all authenticated users */}
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'לוח בקרה',
          headerTitle: 'לוח בקרה - יחידת אלג״ר',
        }}
      />

      {/* Events - Available to all authenticated users */}
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{
          tabBarLabel: 'אירועים',
          headerTitle: 'אירועים',
        }}
      />

      {/* Action Reports - Available to all authenticated users */}
      <Tab.Screen 
        name="ActionReports" 
        component={ActionReportsScreen}
        options={{
          tabBarLabel: 'דוחות פעולה',
          headerTitle: 'דוחות פעולה',
        }}
      />

      {/* Users - Only for controllers and above */}
      {isController && (
        <Tab.Screen 
          name="Users" 
          component={UsersScreen}
          options={{
            tabBarLabel: 'משתמשים',
            headerTitle: 'ניהול משתמשים',
          }}
        />
      )}

      {/* Profile - Available to all authenticated users */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'פרופיל',
          headerTitle: 'פרופיל אישי',
        }}
      />

      {/* Settings - Only for admins */}
      {isAdmin && (
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'הגדרות',
            headerTitle: 'הגדרות מערכת',
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default MainNavigator;
