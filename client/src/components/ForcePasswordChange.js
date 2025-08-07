import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Paper
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../utils/api';

const ForcePasswordChange = ({ open, onPasswordChanged }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (event) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('יש למלא את כל השדות');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setError('הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        onPasswordChanged();
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError(error.response?.data?.message || 'שגיאה בשינוי הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          direction: 'rtl',
          borderRadius: 3
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderBottom: '1px solid #e0e6ed',
        pb: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: '#fff3cd',
          color: '#856404'
        }}>
          <WarningIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            שינוי סיסמה נדרש
          </Typography>
          <Typography variant="body2" color="text.secondary">
            עליך לשנות את הסיסמה הראשונית כדי להמשיך
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SecurityIcon sx={{ fontSize: 20, color: '#6c757d' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              הנחיות לסיסמה חדשה:
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            • לפחות 6 תווים<br />
            • שונה מהסיסמה הנוכחית<br />
            • מומלץ לכלול אותיות ומספרים
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="סיסמה נוכחית"
            type="password"
            value={passwordData.currentPassword}
            onChange={handleChange('currentPassword')}
            onKeyPress={handleKeyPress}
            variant="outlined"
            autoComplete="current-password"
          />
          
          <TextField
            fullWidth
            label="סיסמה חדשה"
            type="password"
            value={passwordData.newPassword}
            onChange={handleChange('newPassword')}
            onKeyPress={handleKeyPress}
            variant="outlined"
            autoComplete="new-password"
          />
          
          <TextField
            fullWidth
            label="אישור סיסמה חדשה"
            type="password"
            value={passwordData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            onKeyPress={handleKeyPress}
            variant="outlined"
            autoComplete="new-password"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          fullWidth
          size="large"
          sx={{ 
            py: 1.5,
            fontWeight: 600
          }}
        >
          {loading ? 'משנה סיסמה...' : 'שנה סיסמה והמשך'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForcePasswordChange;
