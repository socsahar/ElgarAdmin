/**
 * Profile Screen
 * 
 * User profile management with photo upload and information editing
 * Includes settings and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
  IconButton,
  TextInput,
  Switch,
  List,
  Divider,
  Avatar,
  Portal,
  Dialog,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { colors, spacing, shadows } from '../utils/theme';
import { hebrewTexts } from '../utils/hebrewTexts';
import { formatDate, validateEmail, validatePhone } from '../utils/helpers';

const ProfileScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth();
  const { supabase } = useSupabase();
  
  // State
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    profile_photo: '',
  });
  const [preferences, setPreferences] = useState({
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    sound_enabled: true,
    vibration_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
  });
  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        profile_photo: user.profile_photo || '',
      });
      loadPreferences();
    }
  }, [user]);

  // Load user preferences
  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(prev => ({ ...prev, ...data.preferences }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Save preferences
  const savePreferences = async (newPreferences) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: newPreferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('שגיאה', 'שגיאה בשמירת ההעדפות');
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!profileData.first_name || !profileData.last_name) {
      Alert.alert('שגיאה', 'יש למלא שם פרטי ושם משפחה');
      return;
    }

    if (profileData.email && !validateEmail(profileData.email)) {
      Alert.alert('שגיאה', 'כתובת אימייל לא תקינה');
      return;
    }

    if (profileData.phone && !validatePhone(profileData.phone)) {
      Alert.alert('שגיאה', 'מספר טלפון לא תקין');
      return;
    }

    setLoading(true);

    try {
      const success = await updateProfile(profileData);
      if (success) {
        Alert.alert('הצלחה', 'הפרופיל עודכן בהצלחה');
        setEditing(false);
      } else {
        Alert.alert('שגיאה', 'שגיאה בעדכון הפרופיל');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון הפרופיל');
    } finally {
      setLoading(false);
    }
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

  // Handle take photo
  const handleTakePhoto = async () => {
    setPhotoDialogVisible(false);
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('שגיאה', 'נדרשת הרשאת מצלמה');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 512,
      maxHeight: 512,
    };

    launchCamera(options, async (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        await uploadProfilePhoto(response.assets[0]);
      }
    });
  };

  // Handle select from gallery
  const handleSelectFromGallery = () => {
    setPhotoDialogVisible(false);
    
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 512,
      maxHeight: 512,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        await uploadProfilePhoto(response.assets[0]);
      }
    });
  };

  // Upload profile photo
  const uploadProfilePhoto = async (photo) => {
    setLoading(true);

    try {
      const fileExt = photo.fileName?.split('.').pop() || 'jpg';
      const fileName = `profile_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

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

      // Update profile with new photo path
      const updatedProfile = { ...profileData, profile_photo: filePath };
      const success = await updateProfile(updatedProfile);
      
      if (success) {
        setProfileData(updatedProfile);
        Alert.alert('הצלחה', 'תמונת הפרופיל עודכנה בהצלחה');
      } else {
        Alert.alert('שגיאה', 'שגיאה בעדכון תמונת הפרופיל');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('שגיאה', 'שגיאה בהעלאת התמונה');
    } finally {
      setLoading(false);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('הצלחה', 'הסיסמה שונתה בהצלחה');
        setPasswordDialogVisible(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        Alert.alert('שגיאה', result.message || 'שגיאה בשינוי הסיסמה');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('שגיאה', 'שגיאה בשינוי הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  // Handle preference change
  const handlePreferenceChange = (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  // Get profile photo URL
  const getProfilePhotoUrl = () => {
    if (profileData.profile_photo) {
      return `${supabase.supabaseUrl}/storage/v1/object/public/photos/${profileData.profile_photo}`;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* App bar */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={hebrewTexts.profile.title} titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon={editing ? 'check' : 'pencil'}
          onPress={editing ? handleUpdateProfile : () => setEditing(true)}
          disabled={loading}
        />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <Card style={styles.photoCard}>
          <Card.Content style={styles.photoContent}>
            <View style={styles.photoContainer}>
              {getProfilePhotoUrl() ? (
                <Avatar.Image
                  size={120}
                  source={{ uri: getProfilePhotoUrl() }}
                />
              ) : (
                <Avatar.Icon
                  size={120}
                  icon="account"
                  style={styles.avatarIcon}
                />
              )}
              {editing && (
                <IconButton
                  icon="camera"
                  mode="contained"
                  size={24}
                  onPress={() => setPhotoDialogVisible(true)}
                  style={styles.cameraButton}
                />
              )}
            </View>
            <Text style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.userRole}>
              {hebrewTexts.users.roles[user?.role] || user?.role}
            </Text>
          </Card.Content>
        </Card>

        {/* Personal Info Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>{hebrewTexts.profile.personalInfo}</Text>
            
            <TextInput
              label={hebrewTexts.profile.firstName}
              value={profileData.first_name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, first_name: text }))}
              disabled={!editing}
              style={styles.input}
            />
            
            <TextInput
              label={hebrewTexts.profile.lastName}
              value={profileData.last_name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, last_name: text }))}
              disabled={!editing}
              style={styles.input}
            />
            
            <TextInput
              label={hebrewTexts.profile.email}
              value={profileData.email}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
              disabled={!editing}
              keyboardType="email-address"
              style={styles.input}
            />
            
            <TextInput
              label={hebrewTexts.profile.phone}
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              disabled={!editing}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Preferences Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>{hebrewTexts.profile.preferences}</Text>
            
            <List.Item
              title={hebrewTexts.settings.pushNotifications}
              right={() => (
                <Switch
                  value={preferences.push_notifications}
                  onValueChange={(value) => handlePreferenceChange('push_notifications', value)}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title={hebrewTexts.settings.emailNotifications}
              right={() => (
                <Switch
                  value={preferences.email_notifications}
                  onValueChange={(value) => handlePreferenceChange('email_notifications', value)}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title={hebrewTexts.settings.smsNotifications}
              right={() => (
                <Switch
                  value={preferences.sms_notifications}
                  onValueChange={(value) => handlePreferenceChange('sms_notifications', value)}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title={hebrewTexts.settings.sound}
              right={() => (
                <Switch
                  value={preferences.sound_enabled}
                  onValueChange={(value) => handlePreferenceChange('sound_enabled', value)}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title={hebrewTexts.settings.vibration}
              right={() => (
                <Switch
                  value={preferences.vibration_enabled}
                  onValueChange={(value) => handlePreferenceChange('vibration_enabled', value)}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Security Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>{hebrewTexts.profile.security}</Text>
            
            <List.Item
              title={hebrewTexts.profile.changePassword}
              left={(props) => <List.Icon {...props} icon="lock" />}
              onPress={() => setPasswordDialogVisible(true)}
            />
            <Divider />
            
            <List.Item
              title={hebrewTexts.profile.loginHistory}
              left={(props) => <List.Icon {...props} icon="history" />}
              onPress={() => {/* Navigate to login history */}}
            />
          </Card.Content>
        </Card>

        {/* Account Info */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>מידע חשבון</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>תאריך הצטרפות:</Text>
              <Text style={styles.infoValue}>
                {user?.created_at ? formatDate(user.created_at, { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'לא זמין'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>התחברות אחרונה:</Text>
              <Text style={styles.infoValue}>
                {user?.last_login ? formatDate(user.last_login) : 'לא זמין'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Photo selection dialog */}
      <Portal>
        <Dialog
          visible={photoDialogVisible}
          onDismiss={() => setPhotoDialogVisible(false)}
        >
          <Dialog.Title>{hebrewTexts.profile.changePhoto}</Dialog.Title>
          <Dialog.Content>
            <Button
              mode="outlined"
              onPress={handleTakePhoto}
              icon="camera"
              style={styles.photoOption}
            >
              {hebrewTexts.actionReports.takePhoto}
            </Button>
            <Button
              mode="outlined"
              onPress={handleSelectFromGallery}
              icon="image"
              style={styles.photoOption}
            >
              {hebrewTexts.actionReports.selectFromGallery}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPhotoDialogVisible(false)}>
              {hebrewTexts.common.cancel}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Password change dialog */}
        <Dialog
          visible={passwordDialogVisible}
          onDismiss={() => setPasswordDialogVisible(false)}
        >
          <Dialog.Title>{hebrewTexts.profile.changePassword}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={hebrewTexts.auth.currentPassword}
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
              secureTextEntry
              style={styles.passwordInput}
            />
            <TextInput
              label={hebrewTexts.auth.newPassword}
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
              secureTextEntry
              style={styles.passwordInput}
            />
            <TextInput
              label={hebrewTexts.auth.confirmPassword}
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
              secureTextEntry
              style={styles.passwordInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogVisible(false)} disabled={loading}>
              {hebrewTexts.common.cancel}
            </Button>
            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading}
            >
              {hebrewTexts.common.save}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Surface style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>מעדכן...</Text>
          </Surface>
        </View>
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  photoCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  photoContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarIcon: {
    backgroundColor: colors.primary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: colors.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userRole: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  photoOption: {
    marginBottom: spacing.sm,
  },
  passwordInput: {
    backgroundColor: 'transparent',
    marginBottom: spacing.sm,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.medium,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
});

export default ProfileScreen;
