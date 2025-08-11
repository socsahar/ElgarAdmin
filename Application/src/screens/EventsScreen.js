/**
 * Events Screen
 * 
 * Displays events list with role-based filtering, search, and real-time updates
 * Matches website functionality with mobile UX
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  Searchbar,
  FAB,
  Portal,
  Dialog,
  ActivityIndicator,
  Menu,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { colors, spacing, shadows } from '../utils/theme';
import { hebrewTexts } from '../utils/hebrewTexts';
import { formatDate, formatRelativeTime, permissions } from '../utils/helpers';

const EventsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  
  // State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Filter events based on user role and current filters
  const getFilteredEvents = () => {
    let filtered = events;

    // Role-based filtering
    if (user?.role === 'volunteer') {
      // Volunteers see only events assigned to them or unassigned
      filtered = filtered.filter(event => 
        !event.assigned_to || event.assigned_to === user.id
      );
    } else if (user?.role === 'sayer') {
      // Sayers see events in their area or assigned to them
      filtered = filtered.filter(event => 
        event.assigned_to === user.id || 
        event.status === 'new' || 
        event.status === 'assigned'
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(event => event.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.license_number?.toLowerCase().includes(query) ||
        event.reporter_name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Load events
  const loadEvents = async () => {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          assigned_user:users!events_assigned_to_fkey(
            id,
            first_name,
            last_name,
            role
          ),
          reporter:users!events_reporter_id_fkey(
            id,
            first_name,
            last_name
          ),
          vehicle_data:vehicles(
            license_number,
            manufacturer,
            model,
            color,
            year
          )
        `);

      const { data, error } = await query;

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת האירועים');
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    loadEvents();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  // Handle event press
  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setDetailsVisible(true);
  };

  // Handle assign event
  const handleAssignEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          assigned_to: user.id,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      Alert.alert('הצלחה', 'האירוע הוקצה לך בהצלחה');
      setDetailsVisible(false);
      await loadEvents();
    } catch (error) {
      console.error('Error assigning event:', error);
      Alert.alert('שגיאה', 'שגיאה בהקצאת האירוע');
    }
  };

  // Handle update status
  const handleUpdateStatus = async (eventId, newStatus) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      Alert.alert('הצלחה', 'סטטוס האירוע עודכן בהצלחה');
      setDetailsVisible(false);
      await loadEvents();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון הסטטוס');
    }
  };

  // Handle navigate to location
  const handleNavigateToLocation = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert('שגיאה', 'מיקום לא זמין');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הניווט');
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return colors.info;
      case 'assigned': return colors.warning;
      case 'in_progress': return colors.primary;
      case 'resolved': return colors.success;
      case 'closed': return colors.textSecondary;
      case 'cancelled': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return colors.success;
      case 'medium': return colors.warning;
      case 'high': return colors.danger;
      case 'urgent': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  // Render event item
  const renderEventItem = ({ item: event }) => (
    <Card style={styles.eventCard} onPress={() => handleEventPress(event)}>
      <Card.Content>
        {/* Header with status and priority */}
        <View style={styles.eventHeader}>
          <View style={styles.statusRow}>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(event.status) }]}
              textStyle={styles.chipText}
            >
              {hebrewTexts.events.statuses[event.status] || event.status}
            </Chip>
            <Chip
              style={[styles.priorityChip, { backgroundColor: getPriorityColor(event.priority) }]}
              textStyle={styles.chipText}
            >
              {hebrewTexts.events.priorities[event.priority] || event.priority}
            </Chip>
          </View>
          <Text style={styles.eventTime}>
            {formatRelativeTime(event.created_at)}
          </Text>
        </View>

        {/* Event description */}
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>

        {/* Vehicle info */}
        {event.vehicle_data && (
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleText}>
              {event.vehicle_data.license_number} • {event.vehicle_data.manufacturer} {event.vehicle_data.model}
            </Text>
          </View>
        )}

        {/* Location */}
        {event.location && (
          <Text style={styles.locationText} numberOfLines={1}>
            📍 {event.location}
          </Text>
        )}

        {/* Reporter and assignee */}
        <View style={styles.eventFooter}>
          {event.reporter && (
            <Text style={styles.reporterText}>
              דווח: {event.reporter.first_name} {event.reporter.last_name}
            </Text>
          )}
          {event.assigned_user && (
            <Text style={styles.assigneeText}>
              מוקצה: {event.assigned_user.first_name} {event.assigned_user.last_name}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const filteredEvents = getFilteredEvents();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>טוען אירועים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App bar */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={hebrewTexts.events.title} titleStyle={styles.appbarTitle} />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="filter"
              onPress={() => setFilterMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setStatusFilter('all');
              setFilterMenuVisible(false);
            }}
            title="כל הסטטוסים"
            leadingIcon={statusFilter === 'all' ? 'check' : undefined}
          />
          <Divider />
          {Object.entries(hebrewTexts.events.statuses).map(([status, label]) => (
            <Menu.Item
              key={status}
              onPress={() => {
                setStatusFilter(status);
                setFilterMenuVisible(false);
              }}
              title={label}
              leadingIcon={statusFilter === status ? 'check' : undefined}
            />
          ))}
        </Menu>
      </Appbar.Header>

      {/* Search bar */}
      <Searchbar
        placeholder="חיפוש אירועים..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Events list */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>אין אירועים להצגה</Text>
          </View>
        }
      />

      {/* Event details dialog */}
      <Portal>
        <Dialog
          visible={detailsVisible}
          onDismiss={() => setDetailsVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>{hebrewTexts.events.eventDetails}</Dialog.Title>
          <Dialog.ScrollArea>
            {selectedEvent && (
              <View style={styles.dialogContent}>
                {/* Status and priority */}
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>{hebrewTexts.events.status}:</Text>
                  <Chip
                    style={[styles.dialogChip, { backgroundColor: getStatusColor(selectedEvent.status) }]}
                    textStyle={styles.chipText}
                  >
                    {hebrewTexts.events.statuses[selectedEvent.status] || selectedEvent.status}
                  </Chip>
                </View>

                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>{hebrewTexts.events.priority}:</Text>
                  <Chip
                    style={[styles.dialogChip, { backgroundColor: getPriorityColor(selectedEvent.priority) }]}
                    textStyle={styles.chipText}
                  >
                    {hebrewTexts.events.priorities[selectedEvent.priority] || selectedEvent.priority}
                  </Chip>
                </View>

                {/* Description */}
                <View style={styles.dialogSection}>
                  <Text style={styles.dialogLabel}>{hebrewTexts.events.description}:</Text>
                  <Text style={styles.dialogText}>{selectedEvent.description}</Text>
                </View>

                {/* Vehicle info */}
                {selectedEvent.vehicle_data && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>{hebrewTexts.events.vehicle}:</Text>
                    <Text style={styles.dialogText}>
                      {selectedEvent.vehicle_data.license_number} - {selectedEvent.vehicle_data.manufacturer} {selectedEvent.vehicle_data.model}
                    </Text>
                    <Text style={styles.dialogText}>
                      צבע: {selectedEvent.vehicle_data.color} | שנה: {selectedEvent.vehicle_data.year}
                    </Text>
                  </View>
                )}

                {/* Location */}
                {selectedEvent.location && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>{hebrewTexts.events.location}:</Text>
                    <Text style={styles.dialogText}>{selectedEvent.location}</Text>
                    {selectedEvent.latitude && selectedEvent.longitude && (
                      <Button
                        mode="outlined"
                        onPress={() => handleNavigateToLocation(selectedEvent.latitude, selectedEvent.longitude)}
                        style={styles.navigateButton}
                        icon="navigation"
                      >
                        נווט למיקום
                      </Button>
                    )}
                  </View>
                )}

                {/* Times */}
                <View style={styles.dialogSection}>
                  <Text style={styles.dialogLabel}>{hebrewTexts.events.createdAt}:</Text>
                  <Text style={styles.dialogText}>{formatDate(selectedEvent.created_at)}</Text>
                </View>

                {selectedEvent.updated_at !== selectedEvent.created_at && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>{hebrewTexts.events.updatedAt}:</Text>
                    <Text style={styles.dialogText}>{formatDate(selectedEvent.updated_at)}</Text>
                  </View>
                )}

                {/* Reporter and assignee */}
                {selectedEvent.reporter && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>{hebrewTexts.events.reportedBy}:</Text>
                    <Text style={styles.dialogText}>
                      {selectedEvent.reporter.first_name} {selectedEvent.reporter.last_name}
                    </Text>
                  </View>
                )}

                {selectedEvent.assigned_user && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>{hebrewTexts.events.assignedTo}:</Text>
                    <Text style={styles.dialogText}>
                      {selectedEvent.assigned_user.first_name} {selectedEvent.assigned_user.last_name}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {/* Action buttons based on user role and event status */}
            {selectedEvent && permissions.hasPermission(user?.role, 'update_events') && (
              <>
                {!selectedEvent.assigned_to && selectedEvent.status === 'new' && (
                  <Button
                    onPress={() => handleAssignEvent(selectedEvent.id)}
                    mode="contained"
                  >
                    {hebrewTexts.events.assign}
                  </Button>
                )}
                {selectedEvent.assigned_to === user?.id && selectedEvent.status === 'assigned' && (
                  <Button
                    onPress={() => handleUpdateStatus(selectedEvent.id, 'in_progress')}
                    mode="contained"
                  >
                    התחל טיפול
                  </Button>
                )}
                {selectedEvent.assigned_to === user?.id && selectedEvent.status === 'in_progress' && (
                  <Button
                    onPress={() => handleUpdateStatus(selectedEvent.id, 'resolved')}
                    mode="contained"
                  >
                    סגור אירוע
                  </Button>
                )}
              </>
            )}
            <Button onPress={() => setDetailsVisible(false)}>
              {hebrewTexts.common.close}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FAB for creating new event (admin/dispatcher only) */}
      {permissions.hasPermission(user?.role, 'create_events') && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('CreateEvent')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appbarTitle: {
    textAlign: 'right',
  },
  searchBar: {
    margin: spacing.md,
    backgroundColor: colors.surface,
  },
  listContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  eventCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusChip: {
    height: 24,
  },
  priorityChip: {
    height: 24,
  },
  chipText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  eventDescription: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  vehicleInfo: {
    backgroundColor: colors.light,
    padding: spacing.sm,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reporterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  assigneeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogContent: {
    paddingHorizontal: spacing.md,
  },
  dialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dialogSection: {
    marginBottom: spacing.md,
  },
  dialogLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dialogText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dialogChip: {
    height: 24,
  },
  navigateButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default EventsScreen;
