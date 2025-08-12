import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'שגיאה בהתחברות');
      }
      // The App.js will handle the forced password change flow automatically
    } catch (error) {
      console.error('Login error caught:', error);
      setError(error.message || 'שגיאה בהתחברות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: { xs: 1, sm: 2 },
        direction: 'rtl',
        gap: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          maxWidth: 400,
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            textAlign: 'center',
            py: 4,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                backgroundColor: 'white',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: 0.5,
              }}
            >
              <img 
                src="/img/logo.png" 
                alt="לוגו אלגר" 
                style={{ 
                  height: '92px', 
                  width: 'auto',
                  maxWidth: '95px',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div style="color: #1976d2; font-size: 40px; font-weight: bold;">E</div>';
                }}
              />
            </Box>
          </Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Elgar Admin
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            מערכת ניהול אלגר
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <TextField
                id="username"
                name="username"
                fullWidth
                label="שם משתמש"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                sx={{ mb: 2 }}
              />
              
              <TextField
                id="password"
                name="password"
                fullWidth
                label="סיסמה"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              בעיות בהתחברות? פנה למנהל המערכת
            </Typography>
          </Box>
        </CardContent>
      </Paper>
      
      {/* Credits footer for login page */}
      <Box
        sx={{
          mt: 2,
          py: 2,
          px: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            direction: 'rtl',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'text.primary',
              lineHeight: 1.4,
              mb: 0.5,
            }}
          >
            <Box component="span" sx={{ fontSize: '0.9rem', mr: 0.5 }}>©</Box>
            מערכת זו נבנתה ונכתבה על ידי סהר מלול - כל הזכויות שמורות
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: 'text.secondary',
              opacity: 0.8,
              fontStyle: 'italic',
            }}
          >
            © {new Date().getFullYear()} Sahar Malul. All Rights Reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
