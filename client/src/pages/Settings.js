import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Card,
  CardContent,
  Grid,
  Slider,
  TextField
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Save as SaveIcon,
  RestoreFromTrash as ResetIcon
} from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';

const Settings = () => {
  const { mode, language, fontSize, setThemeMode, setThemeLanguage, setThemeFontSize } = useThemeMode();
  
  const [settings, setSettings] = useState({
    // Notification Settings
    pushNotifications: true,
    emergencyAlerts: true,
    systemUpdates: false,
    weeklyReports: true,
    
    // Display Settings - now connected to theme context
    theme: mode,
    language: language,
    fontSize: fontSize,
    compactMode: false,
    showAvatars: true,
    
    // System Settings
    autoRefresh: true,
    refreshInterval: 30,
    maxHistoryDays: 90,
    enableLogging: true,
    
    // Security Settings
    sessionTimeout: 60,
    requirePassword: true,
    twoFactorAuth: false,
    loginNotifications: true
  });

  const [successMessage, setSuccessMessage] = useState('');

  // Update local settings when theme context changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: mode,
      language: language,
      fontSize: fontSize
    }));
  }, [mode, language, fontSize]);

  const handleSettingChange = (setting) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));

    // Update theme context for theme-related settings
    if (setting === 'theme') {
      setThemeMode(value);
    } else if (setting === 'language') {
      setThemeLanguage(value);
    } else if (setting === 'fontSize') {
      setThemeFontSize(value);
    }
  };

  const handleSliderChange = (setting) => (event, newValue) => {
    setSettings(prev => ({
      ...prev,
      [setting]: newValue
    }));

    // Update theme context for fontSize
    if (setting === 'fontSize') {
      setThemeFontSize(newValue);
    }
  };

  const handleSave = () => {
    // Here you would save the settings to the backend
    setSuccessMessage('ההגדרות נשמרו בהצלחה');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleReset = () => {
    setSettings({
      pushNotifications: true,
      emergencyAlerts: true,
      systemUpdates: false,
      weeklyReports: true,
      theme: 'light',
      language: 'he',
      fontSize: 14,
      compactMode: false,
      showAvatars: true,
      autoRefresh: true,
      refreshInterval: 30,
      maxHistoryDays: 90,
      enableLogging: true,
      sessionTimeout: 60,
      requirePassword: true,
      twoFactorAuth: false,
      loginNotifications: true
    });
    setSuccessMessage('ההגדרות אופסו לברירת המחדל');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          הגדרות מערכת
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">הגדרות התראות</Typography>
              </Box>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={handleSettingChange('pushNotifications')}
                    />
                  }
                  label="התראות דחיפה"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emergencyAlerts}
                      onChange={handleSettingChange('emergencyAlerts')}
                    />
                  }
                  label="התראות חירום"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.systemUpdates}
                      onChange={handleSettingChange('systemUpdates')}
                    />
                  }
                  label="עדכוני מערכת"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.weeklyReports}
                      onChange={handleSettingChange('weeklyReports')}
                    />
                  }
                  label="דוחות שבועיים"
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* Display Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PaletteIcon sx={{ mr: 1 }} />
                <Typography variant="h6">הגדרות תצוגה</Typography>
              </Box>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>ערכת נושא</InputLabel>
                <Select
                  value={settings.theme}
                  onChange={handleSettingChange('theme')}
                  label="ערכת נושא"
                >
                  <MenuItem value="light">בהיר</MenuItem>
                  <MenuItem value="dark">כהה</MenuItem>
                  <MenuItem value="auto">אוטומטי</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>שפה</InputLabel>
                <Select
                  value={settings.language}
                  onChange={handleSettingChange('language')}
                  label="שפה"
                >
                  <MenuItem value="he">עברית</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ar">العربية</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>גודל גופן</Typography>
                <Slider
                  value={settings.fontSize}
                  onChange={handleSliderChange('fontSize')}
                  min={12}
                  max={20}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>

              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.compactMode}
                      onChange={handleSettingChange('compactMode')}
                    />
                  }
                  label="מצב קומפקטי"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showAvatars}
                      onChange={handleSettingChange('showAvatars')}
                    />
                  }
                  label="הצג תמונות פרופיל"
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* System Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1 }} />
                <Typography variant="h6">הגדרות מערכת</Typography>
              </Box>
              
              <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoRefresh}
                      onChange={handleSettingChange('autoRefresh')}
                    />
                  }
                  label="רענון אוטומטי"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableLogging}
                      onChange={handleSettingChange('enableLogging')}
                    />
                  }
                  label="רישום פעילות"
                />
              </FormGroup>

              <TextField
                fullWidth
                label="מרווח רענון (שניות)"
                type="number"
                value={settings.refreshInterval}
                onChange={handleSettingChange('refreshInterval')}
                sx={{ mb: 2 }}
                disabled={!settings.autoRefresh}
              />

              <TextField
                fullWidth
                label="שמירת היסטוריה (ימים)"
                type="number"
                value={settings.maxHistoryDays}
                onChange={handleSettingChange('maxHistoryDays')}
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">הגדרות אבטחה</Typography>
              </Box>
              
              <TextField
                fullWidth
                label="זמן פקיעת סשן (דקות)"
                type="number"
                value={settings.sessionTimeout}
                onChange={handleSettingChange('sessionTimeout')}
                sx={{ mb: 2 }}
              />

              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requirePassword}
                      onChange={handleSettingChange('requirePassword')}
                    />
                  }
                  label="דרוש סיסמה לפעולות רגישות"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.twoFactorAuth}
                      onChange={handleSettingChange('twoFactorAuth')}
                    />
                  }
                  label="אימות דו-שלבי"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.loginNotifications}
                      onChange={handleSettingChange('loginNotifications')}
                    />
                  }
                  label="התראות על התחברות"
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleReset}
          >
            איפוס לברירת מחדל
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            שמור הגדרות
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
