/**
 * Dashboard Screen
 * 
 * Main screen showing:
 * - User availability toggle
 * - Active events (role-filtered)
 * - Quick stats
 * - Real-time updates from same database as website
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useSupabase } from '../contexts/SupabaseContext';

const DashboardScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    activeEvents: 0,
    assignedToMe: 0,
    myReports: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user } = useAuth();
  const { isAvailable, toggleAvailability, isTracking } = useLocation();
  const { supabase, isConnected } = useSupabase();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      if (!supabase || !user) return;

      // Fetch active events (role-filtered)
      let eventsQuery = supabase
        .from('events')
        .select('*')
        .eq('status', 'פעיל')
        .order('created_at', { ascending: false });

      // For volunteers (סייר), only show assigned events + 5 latest
      if (user.role === 'סייר') {
        // Get events assigned to this user
        const { data: assignments } = await supabase
          .from('event_volunteer_assignments')
          .select('event_id')
          .eq('volunteer_id', user.id);

        const assignedEventIds = assignments?.map(a => a.event_id) || [];
        
        // Get assigned events + latest 5 events
        const { data: assignedEvents } = await supabase
          .from('events')
          .select('*')
          .in('id', assignedEventIds)
          .eq('status', 'פעיל');

        const { data: latestEvents } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'פעיל')
          .order('created_at', { ascending: false })
          .limit(5);

        // Combine and deduplicate
        const combinedEvents = [
          ...(assignedEvents || []),
          ...(latestEvents || []).filter(e => !assignedEventIds.includes(e.id))
        ];
        
        setEvents(combinedEvents);
      } else {
        // Admins see all events
        const { data: allEvents } = await eventsQuery.limit(20);
        setEvents(allEvents || []);
      }

      // Fetch statistics
      await fetchStats();

    } catch (error) {
      console.error('❌ Dashboard data fetch error:', error);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      if (!supabase || !user) return;

      // Active events count
      const { count: activeCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'פעיל');

      // Events assigned to me
      const { count: assignedCount } = await supabase
        .from('event_volunteer_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('volunteer_id', user.id);

      // My action reports
      const { count: reportsCount } = await supabase
        .from('action_reports')
        .select('*', { count: 'exact', head: true })
        .eq('volunteer_id', user.id);

      setStats({
        activeEvents: activeCount || 0,
        assignedToMe: assignedCount || 0,
        myReports: reportsCount || 0,
      });

    } catch (error) {
      console.error('❌ Stats fetch error:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  // Handle availability toggle
  const handleAvailabilityToggle = async () => {
    try {
      await toggleAvailability();
    } catch (error) {
      console.error('❌ Availability toggle error:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון זמינות');
    }
  };

  // Navigate to event details
  const handleEventPress = (event) => {
    navigation.navigate('Events', { 
      screen: 'EventDetails', 
      params: { eventId: event.id } 
    });
  };

  // Initialize data
  useEffect(() => {
    fetchDashboardData();
  }, [supabase, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!supabase || !user) return;

    // Subscribe to events changes
    const eventsSubscription = supabase
      .channel('events')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'events' },
          () => {
            console.log('🔄 Events updated, refreshing...');
            fetchDashboardData();
          })
      .subscribe();

    // Subscribe to assignments changes
    const assignmentsSubscription = supabase
      .channel('assignments')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'event_volunteer_assignments' },
          () => {
            console.log('🔄 Assignments updated, refreshing...');
            fetchDashboardData();
          })
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      assignmentsSubscription.unsubscribe();
    };
  }, [supabase, user]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* User Info and Availability */}
      <View style={styles.userSection}>
        <Text style={styles.welcomeText}>
          שלום, {user?.full_name || user?.username}
        </Text>
        <Text style={styles.roleText}>
          {user?.role} • {user?.position}
        </Text>
        
        <TouchableOpacity 
          style={[
            styles.availabilityButton,
            isAvailable ? styles.availableButton : styles.unavailableButton
          ]}
          onPress={handleAvailabilityToggle}
        >
          <Icon 
            name={isAvailable ? 'location-on' : 'location-off'} 
            size={24} 
            color="#ffffff" 
          />
          <Text style={styles.availabilityText}>
            {isAvailable ? 'זמין' : 'לא זמין'}
          </Text>
          {isTracking && (
            <Icon name="gps-fixed" size={16} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="event" size={32} color="#3498db" />
            <Text style={styles.statNumber}>{stats.activeEvents}</Text>
            <Text style={styles.statLabel}>אירועים פעילים</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="assignment-ind" size={32} color="#e67e22" />
            <Text style={styles.statNumber}>{stats.assignedToMe}</Text>
            <Text style={styles.statLabel}>הוקצו לי</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="assignment" size={32} color="#27ae60" />
            <Text style={styles.statNumber}>{stats.myReports}</Text>
            <Text style={styles.statLabel}>הדוחות שלי</Text>
          </View>
        </View>
      </View>

      {/* Recent Events */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>אירועים אחרונים</Text>
        
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="event-note" size={48} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>אין אירועים פעילים</Text>
          </View>
        ) : (
          events.map((event) => (
            <TouchableOpacity 
              key={event.id}
              style={styles.eventCard}
              onPress={() => handleEventPress(event)}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.eventTime}>
                  {new Date(event.created_at).toLocaleTimeString('he-IL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              
              <Text style={styles.eventLocation} numberOfLines={1}>
                📍 {event.full_address}
              </Text>
              
              {event.license_plate && (
                <Text style={styles.eventVehicle}>
                  🚗 {event.license_plate} • {event.car_model} • {event.car_color}
                </Text>
              )}
              
              <View style={styles.eventFooter}>
                <Text style={styles.eventStatus}>
                  {event.status}
                </Text>
                <Icon name="chevron-left" size={20} color="#7f8c8d" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Connection Status */}
      <View style={styles.connectionStatus}>
        <Icon 
          name={isConnected ? 'cloud-done' : 'cloud-off'} 
          size={16} 
          color={isConnected ? '#27ae60' : '#e74c3c'} 
        />
        <Text style={[
          styles.connectionText,
          { color: isConnected ? '#27ae60' : '#e74c3c' }
        ]}>
          {isConnected ? 'מחובר לשרת' : 'לא מחובר לשרת'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  userSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  roleText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
  },
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  availableButton: {
    backgroundColor: '#27ae60',
  },
  unavailableButton: {
    backgroundColor: '#e74c3c',
  },
  availabilityText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  statsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 2,
  },
  eventsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'right',
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'right',
  },
  eventTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 10,
  },
  eventLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
    textAlign: 'right',
  },
  eventVehicle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'right',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventStatus: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 5,
  },
});

export default DashboardScreen;
