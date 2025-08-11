/**
 * Elgar Car Theft Tracking Mobile Application
 * Hebrew RTL Support with Real-time Sync
 * 
 * Main Application Component
 * Connects to same Supabase database as website for complete synchronization
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  I18nManager,
  LogBox,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { enableScreens } from 'react-native-screens';

// Import contexts and services
import { AuthProvider } from './src/contexts/AuthContext';
import { SupabaseProvider } from './src/contexts/SupabaseContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

// Import navigation
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

// Import theme and configuration
import { hebrewTheme } from './src/utils/theme';
import { requestPermissions } from './src/utils/permissions';

// Enable screens for better performance
enableScreens();

// Force RTL layout for Hebrew support
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

// Suppress common warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Warning: React.createElement',
    'Warning: ReactDOM.render',
    'Setting a timer',
    'VirtualizedLists should never be nested',
  ]);
}

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Request necessary permissions
        await requestPermissions();
        
        // Additional initialization can be added here
        console.log('🚀 Elgar Mobile App initialized successfully');
        
        setIsReady(true);
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setIsReady(true); // Continue even if some permissions fail
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>יחידת אלג״ר</Text>
          <Text style={styles.loadingSubtext}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider theme={hebrewTheme}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <SupabaseProvider>
          <AuthProvider>
            <LocationProvider>
              <NotificationProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </NotificationProvider>
            </LocationProvider>
          </AuthProvider>
        </SupabaseProvider>
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'System', // Will be replaced with Hebrew font
  },
  loadingSubtext: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

export default App;
