import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Avatar,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../utils/api';

const ImageUpload = ({ 
  value, 
  onChange, 
  label = "תמונת פרופיל", 
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  userId = null // User ID number for renaming the file
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return 'נא לבחור קובץ';
    
    if (file.size > maxSize) {
      return `גודל הקובץ חייב להיות קטן מ-${Math.round(maxSize / (1024 * 1024))}MB`;
    }
    
    if (!acceptedTypes.includes(file.type)) {
      return 'פורמט הקובץ אינו נתמך. נא להעלות תמונה בפורמט JPEG, PNG, GIF או WebP';
    }
    
    return null;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('profilePhoto', file);

      // Upload to server using api instance
      const uploadUrl = userId 
        ? `/api/upload/profile-photo?userId=${encodeURIComponent(userId)}`
        : '/api/upload/profile-photo';
        
      const response = await api.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      
      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      
      // Call onChange with the server filename
      // If userId was provided, the filename will be the ID-based name
      onChange(data.data.filename);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value && !userId) return;

    setUploading(true);
    
    try {
      // Determine what to delete - if we have userId, delete by ID, otherwise by filename
      const deleteTarget = userId || value;
      
      // Delete from server using api instance
      await api.delete(`/api/upload/profile-photo/${deleteTarget}`);

      // Clear preview and value
      setPreview(null);
      onChange('');
      setError('');
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err) {
      console.error('Delete error:', err);
      // Still clear the UI even if server deletion failed
      setPreview(null);
      onChange('');
      setError('');
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = () => {
    if (preview) {
      // If it's a blob URL (from file selection), use it directly
      if (preview.startsWith('blob:')) return preview;
      // If it's just a filename, construct the full URL
      if (typeof preview === 'string' && !preview.startsWith('http')) {
        return `/uploads/profile-photos/${preview}`;
      }
      return preview;
    }
    if (value) {
      // If value is a filename, construct the full URL
      if (typeof value === 'string' && !value.startsWith('http')) {
        return `/uploads/profile-photos/${value}`;
      }
      return value;
    }
    // If no value but we have a userId, try to find the photo by ID
    if (userId && !value && !preview) {
      // We'll try common extensions, but this might need refinement
      // The UserAvatar component handles this better with actual file checking
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      // For now, default to jpg - the onError handler will fallback
      return `/uploads/profile-photos/${userId}.jpg`;
    }
    return null;
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
        {label}
      </Typography>
      
      {/* Avatar Preview */}
      <Box sx={{ mb: 2, position: 'relative', display: 'inline-block' }}>
        <Avatar
          src={getImageUrl()}
          sx={{ 
            width: 120, 
            height: 120, 
            mx: 'auto',
            border: '3px solid',
            borderColor: 'primary.main',
            bgcolor: 'grey.100'
          }}
        >
          {!getImageUrl() && <PersonIcon sx={{ fontSize: 60, color: 'grey.400' }} />}
        </Avatar>
        
        {/* Remove button overlay */}
        {(preview || value) && !uploading && (
          <Tooltip title="הסר תמונה">
            <IconButton
              size="small"
              onClick={handleRemove}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                bgcolor: 'error.main',
                color: 'white',
                '&:hover': { bgcolor: 'error.dark' },
                width: 24,
                height: 24
              }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }}>
          {error}
        </Alert>
      )}

      {/* Upload Button */}
      <Box>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={acceptedTypes.join(',')}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        
        <Button
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
          sx={{ 
            minWidth: 140,
            textTransform: 'none'
          }}
        >
          {uploading ? 'מעלה...' : (preview || value) ? 'החלף תמונה' : 'העלה תמונה'}
        </Button>
      </Box>

      {/* Guidelines */}
      <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
        גודל מקסימלי: {Math.round(maxSize / (1024 * 1024))}MB
        <br />
        פורמטים נתמכים: JPEG, PNG, GIF, WebP
      </Typography>
    </Box>
  );
};

export default ImageUpload;
