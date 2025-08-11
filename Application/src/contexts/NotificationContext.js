/**
 * Notification Context for Mobile Application
 * 
 * Handles push notifications for:
 * - New event alerts
 * - Event assignments
 * - System messages
 * - Action report updates
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { PermissionsAndroid, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';

const NotificationContext = createContext({
  fcmToken: null,
  notificationPermission: null,
  notifications: [],
  requestNotificationPermission: async () => {},
  sendLocalNotification: () => {},
  markNotificationAsRead: () => {},
  clearAllNotifications: () => {},
});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const { user, isAuthenticated } = useAuth();
  const { supabase } = useSupabase();

  // Initialize push notifications
  useEffect(() => {
    initializePushNotifications();
    return () => {
      // Cleanup listeners
    };
  }, []);

  // Initialize FCM and notification listeners
  const initializePushNotifications = async () => {
    try {
      // Request notification permission
      const permission = await requestNotificationPermission();
      
      if (permission) {
        // Get FCM token
        const token = await messaging().getToken();
        setFcmToken(token);
        console.log('📱 FCM Token:', token);

        // Save token to server for user
        if (user && token) {
          await saveFCMTokenToServer(token);
        }

        // Configure local notification channel
        PushNotification.createChannel(
          {
            channelId: 'elgar-notifications',
            channelName: 'Elgar Notifications',
            channelDescription: 'Notifications for Elgar car theft tracking',
            soundName: 'default',
            importance: 4,
            vibrate: true,
          },
          (created) => console.log('📱 Notification channel created:', created)
        );

        // Set up message handlers
        setupMessageHandlers();
      }
    } catch (error) {
      console.error('❌ Push notification initialization error:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'הרשאת התראות',
              message: 'האפליקציה זקוקה להרשאה לשליחת התראות עבור אירועי חירום',
              buttonNeutral: 'שאל מאוחר יותר',
              buttonNegative: 'ביטול',
              buttonPositive: 'אישור',
            }
          );
          
          const permission = granted === PermissionsAndroid.RESULTS.GRANTED;
          setNotificationPermission(permission);
          return permission;
        } else {
          // Android < 13 doesn't need runtime permission
          setNotificationPermission(true);
          return true;
        }
      } else {
        // iOS
        const authStatus = await messaging().requestPermission({
          alert: true,
          badge: true,
          sound: true,
        });
        
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        setNotificationPermission(enabled);
        return enabled;
      }
    } catch (error) {
      console.error('❌ Notification permission error:', error);
      setNotificationPermission(false);
      return false;
    }
  };

  // Setup message handlers
  const setupMessageHandlers = () => {
    // Handle foreground messages
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('📱 Foreground message:', remoteMessage);
      
      // Show local notification when app is in foreground
      sendLocalNotification({
        title: remoteMessage.notification?.title || 'יחידת אלג״ר',
        message: remoteMessage.notification?.body || 'התראה חדשה',
        data: remoteMessage.data,
      });
      
      // Add to notifications list
      addNotificationToList(remoteMessage);
    });

    // Handle background/quit state messages
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📱 Notification opened app:', remoteMessage);
      handleNotificationTap(remoteMessage);
    });

    // Handle notification when app was quit
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📱 App opened from quit state:', remoteMessage);
          handleNotificationTap(remoteMessage);
        }
      });

    return unsubscribeForeground;
  };

  // Send local notification
  const sendLocalNotification = ({ title, message, data = {} }) => {
    PushNotification.localNotification({
      channelId: 'elgar-notifications',
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: data,
      actions: ['פתח', 'התעלם'],
    });
  };

  // Handle notification tap
  const handleNotificationTap = (remoteMessage) => {
    const { data } = remoteMessage;
    
    if (data?.type === 'new_event') {
      // Navigate to events screen
      console.log('📱 Navigate to event:', data.eventId);
    } else if (data?.type === 'assignment') {
      // Navigate to assigned event
      console.log('📱 Navigate to assignment:', data.eventId);
    } else if (data?.type === 'action_report') {
      // Navigate to action reports
      console.log('📱 Navigate to action reports');
    }
  };

  // Add notification to list
  const addNotificationToList = (remoteMessage) => {
    const notification = {
      id: Date.now().toString(),
      title: remoteMessage.notification?.title || 'יחידת אלג״ר',
      body: remoteMessage.notification?.body || 'התראה חדשה',
      data: remoteMessage.data || {},
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [notification, ...prev]);
  };

  // Save FCM token to server
  const saveFCMTokenToServer = async (token) => {
    try {
      if (!user || !supabase) return;

      // Save token to volunteers table
      const { error } = await supabase
        .from('volunteers')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          last_token_update: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ FCM token save error:', error);
      } else {
        console.log('✅ FCM token saved to server');
      }
    } catch (error) {
      console.error('❌ Server FCM token save error:', error);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    PushNotification.cancelAllLocalNotifications();
  };

  // Update FCM token when user logs in
  useEffect(() => {
    if (isAuthenticated && user && fcmToken) {
      saveFCMTokenToServer(fcmToken);
    }
  }, [isAuthenticated, user, fcmToken]);

  const value = {
    fcmToken,
    notificationPermission,
    notifications,
    requestNotificationPermission,
    sendLocalNotification,
    markNotificationAsRead,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
