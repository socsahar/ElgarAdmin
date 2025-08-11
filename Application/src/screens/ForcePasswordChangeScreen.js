/**
 * Force Password Change Screen
 * 
 * Mandatory password change for users with default password
 * Same system as website - cannot be dismissed until password changed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const ForcePasswordChangeScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { updatePassword, user } = useAuth();

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    }
    if (password === '123456') {
      return 'לא ניתן להשתמש בסיסמת ברירת המחדל';
    }
    return null;
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('שגיאה', passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        Alert.alert(
          'הצלחה', 
          'הסיסמה עודכנה בהצלחה', 
          [{ text: 'אישור', onPress: () => console.log('Password changed successfully') }]
        );
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בעדכון הסיסמה');
      }
    } catch (error) {
      console.error('❌ Password change error:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון הסיסמה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>שינוי סיסמה חובה</Text>
          <Text style={styles.subtitle}>
            שלום {user?.full_name || user?.username}
          </Text>
          <Text style={styles.message}>
            בשל סיבות אבטחה, נדרש לשנות את הסיסמה לפני כניסה למערכת
          </Text>
        </View>

        {/* Password Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>סיסמה חדשה</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="הכנס סיסמה חדשה (לפחות 6 תווים)"
              placeholderTextColor="#95a5a6"
              secureTextEntry
              textAlign="right"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>אישור סיסמה</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="הכנס שוב את הסיסמה החדשה"
              placeholderTextColor="#95a5a6"
              secureTextEntry
              textAlign="right"
              editable={!isLoading}
              onSubmitEditing={handlePasswordChange}
            />
          </View>

          <TouchableOpacity 
            style={[styles.changeButton, isLoading && styles.disabledButton]}
            onPress={handlePasswordChange}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.changeButtonText}>עדכן סיסמה</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Requirements */}
        <View style={styles.requirements}>
          <Text style={styles.requirementsTitle}>דרישות סיסמה:</Text>
          <Text style={styles.requirementItem}>• לפחות 6 תווים</Text>
          <Text style={styles.requirementItem}>• לא זהה לסיסמת ברירת המחדל</Text>
          <Text style={styles.requirementItem}>• מומלץ שילוב של אותיות ומספרים</Text>
        </View>

        {/* Warning */}
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ לא ניתן לגשת למערכת ללא שינוי הסיסמה
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#2c3e50',
  },
  changeButton: {
    backgroundColor: '#e74c3c',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    elevation: 0,
    shadowOpacity: 0,
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requirements: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'right',
  },
  requirementItem: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
    textAlign: 'right',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ForcePasswordChangeScreen;
