/**
 * Login Screen
 * 
 * Username-based login matching website authentication system
 * Hebrew RTL interface with same validation as website
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'נא למלא שם משתמש וסיסמה');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        // Login successful - navigation will be handled by AppNavigator
        console.log('✅ Login successful');
        
        if (result.mustChangePassword) {
          // User will be redirected to ForcePasswordChange by AppNavigator
          console.log('🔒 Password change required');
        }
      } else {
        // Show error message
        Alert.alert('שגיאת התחברות', result.error || 'שגיאה לא ידועה');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('שגיאה', 'שגיאה בהתחברות לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Logo and Title */}
          <View style={styles.header}>
            <Text style={styles.title}>יחידת אלג״ר</Text>
            <Text style={styles.subtitle}>מערכת מעקב גניבות רכב</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>שם משתמש</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="הכנס שם משתמש"
                placeholderTextColor="#95a5a6"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="right"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>סיסמה</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="הכנס סיסמה"
                placeholderTextColor="#95a5a6"
                secureTextEntry
                textAlign="right"
                editable={!isLoading}
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>התחבר</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              האפליקציה מיועדת למתנדבי יחידת אלג״ר
            </Text>
            <Text style={styles.versionText}>גרסה 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
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
  loginButton: {
    backgroundColor: '#3498db',
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
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
    color: '#bdc3c7',
    textAlign: 'center',
  },
});

export default LoginScreen;
