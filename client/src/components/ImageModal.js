import React from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const ImageModal = ({ open, onClose, imageUrl, userName, userRole }) => {
  const getRoleColor = (role) => {
    const roleColors = {
      'אדמין': '#f44336',
      'admin': '#f44336',
      'ADMIN': '#f44336',
      'מוקדן': '#2196f3',
      'dispatcher': '#2196f3',
      'DISPATCHER': '#2196f3',
      'מפקד משל"ט': '#ff9800',
      'פיקוד יחידה': '#9c27b0',
      'סייר': '#4caf50',
      'מפתח': '#607d8b'
    };
    return roleColors[role] || '#757575';
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
          maxWidth: '500px'
        }
      }}
    >
      <Box sx={{ position: 'relative', p: 2 }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
        
        <DialogContent sx={{ p: 0, textAlign: 'center' }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={`תמונת פרופיל של ${userName}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                  onError={handleImageError}
                />
                <Avatar
                  sx={{
                    width: 300,
                    height: 300,
                    bgcolor: getRoleColor(userRole),
                    fontSize: '120px',
                    display: 'none',
                    margin: '0 auto'
                  }}
                >
                  <PersonIcon sx={{ fontSize: '120px' }} />
                </Avatar>
              </>
            ) : (
              <Avatar
                sx={{
                  width: 300,
                  height: 300,
                  bgcolor: getRoleColor(userRole),
                  fontSize: '120px',
                  margin: '0 auto'
                }}
              >
                <PersonIcon sx={{ fontSize: '120px' }} />
              </Avatar>
            )}
          </Box>
          
          {userName && (
            <Typography variant="h6" sx={{ mt: 2, color: 'text.primary' }}>
              {userName}
            </Typography>
          )}
          
          {userRole && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {userRole}
            </Typography>
          )}
        </DialogContent>
      </Box>
    </Dialog>
  );
};

export default ImageModal;
