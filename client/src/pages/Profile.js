import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Person as PersonIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  Phone as PhoneIcon,
  DirectionsCar as CarIcon,
  Work as WorkIcon,
  CreditCard as IdIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import api from '../utils/api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    phone_number: '',
    id_number: '',
    position: '',
    has_car: false,
    car_type: '',
    license_plate: '',
    car_color: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load real user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        id_number: user.id_number || '',
        position: user.position || '',
        has_car: user.has_car || false,
        car_type: user.car_type || '',
        license_plate: user.license_plate || '',
        car_color: user.car_color || ''
      });
    }
  }, [user]);

  const handleProfileChange = (field) => (event) => {
    setProfileData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSaveCarStatus = async (hasCar) => {
    try {
      const response = await api.put('/auth/profile', {
        has_car: hasCar
      });
      
      if (response.data.success) {
        updateUser(response.data.user);
        setSuccessMessage('סטטוס הרכב עודכן בהצלחה');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Car status update error:', error);
      setErrorMessage('שגיאה בעדכון סטטוס הרכב');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleSaveCarInfo = async () => {
    try {
      const response = await api.put('/auth/profile', {
        has_car: profileData.has_car,
        car_type: profileData.car_type,
        license_plate: profileData.license_plate,
        car_color: profileData.car_color
      });
      
      if (response.data.success) {
        updateUser(response.data.user);
        setSuccessMessage('פרטי הרכב עודכנו בהצלחה');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Car info update error:', error);
      setErrorMessage('שגיאה בעדכון פרטי הרכב');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('הסיסמאות אינן תואמות');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('הסיסמה חייבת להכיל לפחות 6 תווים');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        setSuccessMessage('הסיסמה שונתה בהצלחה');
        setShowPasswordForm(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Password change error:', error);
      setErrorMessage(error.response?.data?.message || 'שגיאה בשינוי הסיסמה');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'מפתח': 'מפתח',
      'אדמין': 'אדמין',
      'פיקוד יחידה': 'פיקוד יחידה',
      'מפקד משל"ט': 'מפקד משל"ט',
      'מוקדן': 'מוקדן',
      'סייר': 'סייר',
      'admin': 'אדמין',
      'ADMIN': 'אדמין',
      'DISPATCHER': 'מוקדן',
      'dispatcher': 'מוקדן'
    };
    return roleMap[role] || role;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PersonIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          פרופיל משתמש
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">פרטים אישיים</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <UserAvatar
                user={user}
                size={80}
                roleColor="primary"
              />
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6">{profileData.full_name}</Typography>
                <Chip 
                  label={getRoleDisplayName(user?.role)} 
                  color="primary" 
                  size="small" 
                />
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="שם משתמש"
                  value={profileData.username}
                  disabled={true}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="שם מלא"
                  value={profileData.full_name}
                  disabled={true}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="תעודת זהות"
                  value={profileData.id_number}
                  disabled={true}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <IdIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="טלפון"
                  value={profileData.phone_number}
                  disabled={true}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="תפקיד"
                  value={getRoleDisplayName(user?.role)}
                  disabled={true}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="מעמד"
                  value={profileData.position}
                  disabled={true}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
            </Grid>

            {/* Car Information Section */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <CarIcon sx={{ mr: 1 }} />
              פרטי רכב
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={profileData.has_car}
                      onChange={(e) => {
                        const newHasCar = e.target.checked;
                        setProfileData(prev => ({
                          ...prev,
                          has_car: newHasCar
                        }));
                        // Auto-save the car status
                        handleSaveCarStatus(newHasCar);
                      }}
                    />
                  }
                  label="יש לי רכב"
                />
              </Grid>
              
              {profileData.has_car && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="סוג רכב"
                      value={profileData.car_type}
                      onChange={handleProfileChange('car_type')}
                      disabled={false}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="לוחית רישוי"
                      value={profileData.license_plate}
                      onChange={handleProfileChange('license_plate')}
                      disabled={false}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="צבע רכב"
                      value={profileData.car_color}
                      onChange={handleProfileChange('car_color')}
                      disabled={false}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      onClick={handleSaveCarInfo}
                      variant="contained"
                      color="primary"
                      sx={{ mt: 2 }}
                    >
                      שמור פרטי רכב
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Password Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                אבטחה
              </Typography>
              {!showPasswordForm ? (
                <Button
                  startIcon={<SecurityIcon />}
                  onClick={() => setShowPasswordForm(true)}
                  variant="outlined"
                >
                  שנה סיסמה
                </Button>
              ) : (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="סיסמה נוכחית"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange('currentPassword')}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="סיסמה חדשה"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange('newPassword')}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="אישור סיסמה חדשה"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange('confirmPassword')}
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      onClick={handleChangePassword}
                      variant="contained"
                      color="primary"
                    >
                      שמור סיסמה
                    </Button>
                    <Button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      variant="outlined"
                    >
                      ביטול
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Account Stats */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                סטטיסטיקות חשבון
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      תאריך הצטרפות
                    </Typography>
                    <Typography variant="body1">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('he-IL') : 'לא זמין'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      סטטוס חשבון
                    </Typography>
                    <Typography variant="body1">
                      {user?.is_active ? 'פעיל' : 'לא פעיל'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IdIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      מזהה משתמש
                    </Typography>
                    <Typography variant="body1">
                      {user?.id_number || 'לא זמין'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;
