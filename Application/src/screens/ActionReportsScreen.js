/**
 * Action Reports Screen
 * 
 * Displays action reports list and allows creating new reports
 * Integrates with camera for photo capture and gallery selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Image,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
  IconButton,
  Searchbar,
  FAB,
  Portal,
  Dialog,
  ActivityIndicator,
  TextInput,
  Chip,
  Surface,
} from 'react-native-paper';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { colors, spacing, shadows } from '../utils/theme';
import { hebrewTexts } from '../utils/hebrewTexts';
import { formatDate, formatRelativeTime, permissions } from '../utils/helpers';

const ActionReportsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  
  // State
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create report state
  const [newReport, setNewReport] = useState({
    event_id: '',
    action_taken: '',
    outcome: '',
    notes: '',
    photos: [],
  });

  // Load reports
  const loadReports = async () => {
    try {
      let query = supabase
        .from('action_reports')
        .select(`
          *,
          event:events!action_reports_event_id_fkey(
            id,
            description,
            status,
            priority,
            location
          ),
          reporter:users!action_reports_user_id_fkey(
            id,
            first_name,
            last_name,
            role
          )
        `);

      // Filter by user role
      if (user?.role === 'sayer' || user?.role === 'volunteer') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת הדוחות');
    }
  };

  // Load events for report creation
  const loadEvents = async () => {
    try {
      let query = supabase
        .from('events')
        .select('id, description, status, location, created_at')
        .in('status', ['assigned', 'in_progress', 'resolved']);

      // Filter by assigned events for non-admin users
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([loadReports(), loadEvents()]);
      setLoading(false);
    };

    initializeData();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('reports_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_reports',
        },
        () => {
          loadReports();
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
    await Promise.all([loadReports(), loadEvents()]);
    setRefreshing(false);
  };

  // Handle report press
  const handleReportPress = (report) => {
    setSelectedReport(report);
    setDetailsVisible(true);
  };

  // Request camera permissions
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'הרשאת מצלמה',
            message: 'האפליקציה זקוקה לגישה למצלמה כדי לצלם תמונות',
            buttonNeutral: 'שאל אותי מאוחר יותר',
            buttonNegative: 'ביטול',
            buttonPositive: 'אישור',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Handle add photo
  const handleAddPhoto = () => {
    Alert.alert(
      'הוסף תמונה',
      'בחר אפשרות',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'צלם', onPress: handleTakePhoto },
        { text: 'בחר מהגלריה', onPress: handleSelectFromGallery },
      ]
    );
  };

  // Handle take photo
  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('שגיאה', 'נדרשת הרשאת מצלמה');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchCamera(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const photo = response.assets[0];
        setNewReport(prev => ({
          ...prev,
          photos: [...prev.photos, photo],
        }));
      }
    });
  };

  // Handle select from gallery
  const handleSelectFromGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets) {
        setNewReport(prev => ({
          ...prev,
          photos: [...prev.photos, ...response.assets],
        }));
      }
    });
  };

  // Handle remove photo
  const handleRemovePhoto = (index) => {
    setNewReport(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  // Upload photo to Supabase storage
  const uploadPhoto = async (photo) => {
    try {
      const fileExt = photo.fileName?.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `action-reports/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: photo.type,
        name: fileName,
      });

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, formData);

      if (error) throw error;

      return filePath;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  // Handle submit report
  const handleSubmitReport = async () => {
    if (!newReport.event_id || !newReport.action_taken) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות החובה');
      return;
    }

    setSubmitting(true);

    try {
      // Upload photos
      const photoUrls = [];
      for (const photo of newReport.photos) {
        const photoPath = await uploadPhoto(photo);
        photoUrls.push(photoPath);
      }

      // Create report
      const { error } = await supabase
        .from('action_reports')
        .insert({
          event_id: newReport.event_id,
          user_id: user.id,
          action_taken: newReport.action_taken,
          outcome: newReport.outcome,
          notes: newReport.notes,
          photos: photoUrls,
          status: 'submitted',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('הצלחה', 'הדוח נשלח בהצלחה');
      setCreateVisible(false);
      setNewReport({
        event_id: '',
        action_taken: '',
        outcome: '',
        notes: '',
        photos: [],
      });
      await loadReports();
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('שגיאה', 'שגיאה בשליחת הדוח');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter reports
  const getFilteredReports = () => {
    let filtered = reports;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.action_taken?.toLowerCase().includes(query) ||
        report.outcome?.toLowerCase().includes(query) ||
        report.notes?.toLowerCase().includes(query) ||
        report.event?.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return colors.textSecondary;
      case 'submitted': return colors.info;
      case 'approved': return colors.success;
      case 'rejected': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  // Render report item
  const renderReportItem = ({ item: report }) => (
    <Card style={styles.reportCard} onPress={() => handleReportPress(report)}>
      <Card.Content>
        {/* Header with status */}
        <View style={styles.reportHeader}>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(report.status) }]}
            textStyle={styles.chipText}
          >
            {hebrewTexts.actionReports[report.status] || report.status}
          </Chip>
          <Text style={styles.reportTime}>
            {formatRelativeTime(report.created_at)}
          </Text>
        </View>

        {/* Event info */}
        {report.event && (
          <View style={styles.eventInfo}>
            <Text style={styles.eventLabel}>אירוע:</Text>
            <Text style={styles.eventText} numberOfLines={1}>
              {report.event.description}
            </Text>
          </View>
        )}

        {/* Action taken */}
        <Text style={styles.actionText} numberOfLines={2}>
          {report.action_taken}
        </Text>

        {/* Outcome */}
        {report.outcome && (
          <Text style={styles.outcomeText} numberOfLines={1}>
            תוצאה: {report.outcome}
          </Text>
        )}

        {/* Photos indicator */}
        {report.photos && report.photos.length > 0 && (
          <View style={styles.photosIndicator}>
            <IconButton icon="camera" size={16} />
            <Text style={styles.photosCount}>{report.photos.length} תמונות</Text>
          </View>
        )}

        {/* Reporter */}
        {report.reporter && (
          <Text style={styles.reporterText}>
            {report.reporter.first_name} {report.reporter.last_name}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const filteredReports = getFilteredReports();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>טוען דוחות...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App bar */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={hebrewTexts.actionReports.title} titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      {/* Search bar */}
      <Searchbar
        placeholder="חיפוש דוחות..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Reports list */}
      <FlatList
        data={filteredReports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>אין דוחות להצגה</Text>
          </View>
        }
      />

      {/* Report details dialog */}
      <Portal>
        <Dialog
          visible={detailsVisible}
          onDismiss={() => setDetailsVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>{hebrewTexts.actionReports.reportDetails}</Dialog.Title>
          <Dialog.ScrollArea>
            {selectedReport && (
              <ScrollView style={styles.dialogContent}>
                {/* Status */}
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>סטטוס:</Text>
                  <Chip
                    style={[styles.dialogChip, { backgroundColor: getStatusColor(selectedReport.status) }]}
                    textStyle={styles.chipText}
                  >
                    {hebrewTexts.actionReports[selectedReport.status] || selectedReport.status}
                  </Chip>
                </View>

                {/* Event */}
                {selectedReport.event && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>אירוע:</Text>
                    <Text style={styles.dialogText}>{selectedReport.event.description}</Text>
                    {selectedReport.event.location && (
                      <Text style={styles.dialogText}>מיקום: {selectedReport.event.location}</Text>
                    )}
                  </View>
                )}

                {/* Action taken */}
                <View style={styles.dialogSection}>
                  <Text style={styles.dialogLabel}>פעולה שננקטה:</Text>
                  <Text style={styles.dialogText}>{selectedReport.action_taken}</Text>
                </View>

                {/* Outcome */}
                {selectedReport.outcome && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>תוצאה:</Text>
                    <Text style={styles.dialogText}>{selectedReport.outcome}</Text>
                  </View>
                )}

                {/* Notes */}
                {selectedReport.notes && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>הערות:</Text>
                    <Text style={styles.dialogText}>{selectedReport.notes}</Text>
                  </View>
                )}

                {/* Photos */}
                {selectedReport.photos && selectedReport.photos.length > 0 && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>תמונות:</Text>
                    <ScrollView horizontal style={styles.photosContainer}>
                      {selectedReport.photos.map((photo, index) => (
                        <Image
                          key={index}
                          source={{ uri: `${supabase.supabaseUrl}/storage/v1/object/public/photos/${photo}` }}
                          style={styles.photo}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Times */}
                <View style={styles.dialogSection}>
                  <Text style={styles.dialogLabel}>נוצר ב:</Text>
                  <Text style={styles.dialogText}>{formatDate(selectedReport.created_at)}</Text>
                </View>

                {/* Reporter */}
                {selectedReport.reporter && (
                  <View style={styles.dialogSection}>
                    <Text style={styles.dialogLabel}>דווח על ידי:</Text>
                    <Text style={styles.dialogText}>
                      {selectedReport.reporter.first_name} {selectedReport.reporter.last_name}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetailsVisible(false)}>
              {hebrewTexts.common.close}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Create report dialog */}
        <Dialog
          visible={createVisible}
          onDismiss={() => setCreateVisible(false)}
          style={styles.createDialog}
        >
          <Dialog.Title>{hebrewTexts.actionReports.newReport}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={styles.createContent}>
              {/* Event selection */}
              <Text style={styles.inputLabel}>אירוע *</Text>
              <Surface style={styles.eventSelector}>
                {events.map((event) => (
                  <Button
                    key={event.id}
                    mode={newReport.event_id === event.id ? 'contained' : 'outlined'}
                    onPress={() => setNewReport(prev => ({ ...prev, event_id: event.id }))}
                    style={styles.eventButton}
                  >
                    {event.description.substring(0, 50)}...
                  </Button>
                ))}
              </Surface>

              {/* Action taken */}
              <Text style={styles.inputLabel}>פעולה שננקטה *</Text>
              <TextInput
                value={newReport.action_taken}
                onChangeText={(text) => setNewReport(prev => ({ ...prev, action_taken: text }))}
                multiline
                numberOfLines={3}
                style={styles.textInput}
                placeholder="תאר את הפעולה שבוצעה..."
              />

              {/* Outcome */}
              <Text style={styles.inputLabel}>תוצאה</Text>
              <TextInput
                value={newReport.outcome}
                onChangeText={(text) => setNewReport(prev => ({ ...prev, outcome: text }))}
                multiline
                numberOfLines={2}
                style={styles.textInput}
                placeholder="תאר את התוצאה..."
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>הערות</Text>
              <TextInput
                value={newReport.notes}
                onChangeText={(text) => setNewReport(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={3}
                style={styles.textInput}
                placeholder="הערות נוספות..."
              />

              {/* Photos */}
              <View style={styles.photosSection}>
                <View style={styles.photosHeader}>
                  <Text style={styles.inputLabel}>תמונות</Text>
                  <Button
                    mode="outlined"
                    onPress={handleAddPhoto}
                    icon="camera"
                    compact
                  >
                    הוסף תמונה
                  </Button>
                </View>
                {newReport.photos.length > 0 && (
                  <ScrollView horizontal style={styles.selectedPhotos}>
                    {newReport.photos.map((photo, index) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image source={{ uri: photo.uri }} style={styles.selectedPhoto} />
                        <IconButton
                          icon="close"
                          size={16}
                          onPress={() => handleRemovePhoto(index)}
                          style={styles.removePhotoButton}
                        />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)} disabled={submitting}>
              {hebrewTexts.common.cancel}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitReport}
              loading={submitting}
              disabled={submitting}
            >
              {hebrewTexts.actionReports.submit}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FAB for creating new report */}
      {permissions.hasPermission(user?.role, 'create_reports') && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setCreateVisible(true)}
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
  reportCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusChip: {
    height: 24,
  },
  chipText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  reportTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  eventLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  eventText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  outcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  photosIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photosCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  reporterText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'left',
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
  photosContainer: {
    marginTop: spacing.sm,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  createDialog: {
    maxHeight: '90%',
  },
  createContent: {
    paddingHorizontal: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  eventSelector: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  eventButton: {
    marginBottom: spacing.xs,
  },
  photosSection: {
    marginTop: spacing.md,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectedPhotos: {
    marginTop: spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    marginLeft: spacing.sm,
  },
  selectedPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.danger,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default ActionReportsScreen;
