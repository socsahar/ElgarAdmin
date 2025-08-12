import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = 'טוען...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        gap: 3,
        direction: 'rtl',
      }}
    >
      {/* Logo container */}
      <Box
        sx={{
          width: 120,
          height: 120,
          backgroundColor: 'white',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          mb: 2,
          position: 'relative',
        }}
      >
        <img 
          src="/img/logo.png" 
          alt="לוגו אלגר" 
          style={{ 
            height: '90px', 
            width: 'auto',
            maxWidth: '100px',
            objectFit: 'contain'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div style="color: #1976d2; font-size: 48px; font-weight: bold;">E</div>';
          }}
        />
      </Box>

      {/* App title */}
      <Typography 
        variant="h4" 
        component="h1" 
        sx={{ 
          color: 'white', 
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 1,
        }}
      >
        Elgar Admin
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{ 
          color: 'rgba(255,255,255,0.9)', 
          textAlign: 'center',
          mb: 3,
        }}
      >
        מערכת ניהול אלגר
      </Typography>

      {/* Loading spinner */}
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress 
          size={60} 
          thickness={4}
          sx={{ 
            color: 'white',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }} 
        />
      </Box>
      
      {/* Loading message */}
      <Typography 
        variant="body1" 
        sx={{ 
          color: 'rgba(255,255,255,0.8)',
          textAlign: 'center',
          fontSize: '1.1rem',
          fontWeight: 500,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
