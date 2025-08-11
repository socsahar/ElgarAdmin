/**
 * Location Context for Mobile Application
 * 
 * Handles GPS location tracking for availability system:
 * - Location tracking only when user is "זמין" (Available)
 * - Real-time location updates to server
 * - Permission management
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';

const LocationContext = createContext({
  currentLocation: null,
  isTracking: false,
  isAvailable: false,
  locationPermission: null,
  startTracking: async () => {},
  stopTracking: async () => {},
  toggleAvailability: async () => {},
  requestLocationPermission: async () => {},
});

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [watchId, setWatchId] = useState(null);

  const { user, isAuthenticated } = useAuth();
  const { supabase } = useSupabase();

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'הרשאת מיקום',
            message: 'האפליקציה זקוקה לגישה למיקום כדי לעקוב אחר זמינותך',
            buttonNeutral: 'שאל מאוחר יותר',
            buttonNegative: 'ביטול',
            buttonPositive: 'אישור',
          }
        );
        
        const permission = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(permission);
        
        console.log('📍 Location permission:', permission ? 'granted' : 'denied');
        return permission;
      } else {
        // iOS permission handling would go here
        setLocationPermission(true);
        return true;
      }
    } catch (error) {
      console.error('❌ Location permission error:', error);
      setLocationPermission(false);
      return false;
    }
  };

  // Start location tracking
  const startTracking = async () => {
    try {
      const hasPermission = locationPermission || await requestLocationPermission();
      
      if (!hasPermission) {
        console.warn('⚠️ Location permission not granted');
        return false;
      }

      // Configure geolocation options
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      };

      // Start watching position
      const id = Geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          
          setCurrentLocation(location);
          updateLocationOnServer(location);
          
          console.log('📍 Location updated:', location.latitude, location.longitude);
        },
        (error) => {
          console.error('❌ Location error:', error);
        },
        options
      );

      setWatchId(id);
      setIsTracking(true);
      
      console.log('📍 Location tracking started');
      return true;
    } catch (error) {
      console.error('❌ Start tracking error:', error);
      return false;
    }
  };

  // Stop location tracking
  const stopTracking = async () => {
    try {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      
      setIsTracking(false);
      setCurrentLocation(null);
      
      // Clear location on server
      await updateLocationOnServer(null);
      
      console.log('📍 Location tracking stopped');
    } catch (error) {
      console.error('❌ Stop tracking error:', error);
    }
  };

  // Update location on server (same as website system)
  const updateLocationOnServer = async (location) => {
    try {
      if (!user || !supabase) return;

      // Update volunteer location in database (same table as website)
      const { error } = await supabase
        .from('volunteers')
        .upsert({
          user_id: user.id,
          current_latitude: location?.latitude || null,
          current_longitude: location?.longitude || null,
          last_location_update: location ? new Date().toISOString() : null,
          location_accuracy: location?.accuracy || null,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Location update error:', error);
      }
    } catch (error) {
      console.error('❌ Server location update error:', error);
    }
  };

  // Toggle availability status
  const toggleAvailability = async () => {
    try {
      const newAvailability = !isAvailable;
      
      if (newAvailability) {
        // Going available - start tracking
        const trackingStarted = await startTracking();
        if (trackingStarted) {
          setIsAvailable(true);
          await updateAvailabilityOnServer('זמין');
        }
      } else {
        // Going unavailable - stop tracking
        await stopTracking();
        setIsAvailable(false);
        await updateAvailabilityOnServer('לא זמין');
      }
      
      console.log('🟢 Availability toggled to:', newAvailability ? 'זמין' : 'לא זמין');
    } catch (error) {
      console.error('❌ Toggle availability error:', error);
    }
  };

  // Update availability status on server
  const updateAvailabilityOnServer = async (status) => {
    try {
      if (!user || !supabase) return;

      // Update user availability in database
      const { error } = await supabase
        .from('volunteers')
        .upsert({
          user_id: user.id,
          status: status,
          last_status_update: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Availability update error:', error);
      }
    } catch (error) {
      console.error('❌ Server availability update error:', error);
    }
  };

  // Initialize location permission check
  useEffect(() => {
    if (isAuthenticated) {
      requestLocationPermission();
    }
  }, [isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const value = {
    currentLocation,
    isTracking,
    isAvailable,
    locationPermission,
    startTracking,
    stopTracking,
    toggleAvailability,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
