/**
 * Supabase Context for Mobile Application
 * 
 * Connects to the SAME Supabase database as the website
 * Provides real-time synchronization across web and mobile platforms
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - SAME credentials as website
const SUPABASE_URL = 'https://smchvtbqzqssywlgshjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtY2h2dGJxenFzc3l3bGdzaGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTUwNTUsImV4cCI6MjA2OTQ3MTA1NX0.xxOO5fyAY3RsSKo-xK1gJiDCOgNNxvpSk5AB8eWsDhQ';

// Create Supabase client with mobile-specific configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const SupabaseContext = createContext({
  supabase: null,
  isConnected: false,
  connectionError: null,
});

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Test connection to database
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1);

        if (error) {
          console.error('❌ Supabase connection error:', error);
          setConnectionError(error.message);
          setIsConnected(false);
        } else {
          console.log('✅ Supabase connected successfully to mobile app');
          setIsConnected(true);
          setConnectionError(null);
        }
      } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      }
    };

    initializeConnection();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    supabase,
    isConnected,
    connectionError,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

// Export supabase client for direct use
export { supabase };
