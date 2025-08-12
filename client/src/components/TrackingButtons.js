import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Chip } from '@mui/material';
import { LocationOn as LocationIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { volunteerAssignmentAPI } from '../utils/volunteerAssignmentAPI';

const TrackingButtons = ({ assignment, currentUser, onStatusUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, requesting, granted, denied

  // Debug logging
  console.log('TrackingButtons rendered with:', {
    assignment: assignment,
    currentUser: currentUser,
    isAssignedVolunteer: assignment?.volunteer_id === currentUser?.id
  });

  // Only show for the assigned volunteer
  const isAssignedVolunteer = assignment.volunteer_id === currentUser.id;
  
  if (!isAssignedVolunteer || !assignment) {
    console.log('TrackingButtons: Not showing buttons - isAssignedVolunteer:', isAssignedVolunteer, 'assignment exists:', !!assignment);
    return null;
  }

  // Fetch tracking info on component mount
  useEffect(() => {
    if (assignment.id) {
      fetchTrackingInfo();
    }
  }, [assignment.id]);

  const fetchTrackingInfo = async () => {
    try {
      const info = await volunteerAssignmentAPI.getTrackingInfo(assignment.id);
      setTrackingInfo(info);
    } catch (err) {
      console.error('Error fetching tracking info:', err);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('הדפדפן לא תומך במיקום GPS'));
        return;
      }

      setLocationStatus('requesting');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus('granted');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          setLocationStatus('denied');
          let errorMessage = 'שגיאה בקבלת מיקום';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'הגישה למיקום נדחתה. אנא אפשר גישה למיקום בהגדרות הדפדפן';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'המיקום לא זמין כרגע';
              break;
            case error.TIMEOUT:
              errorMessage = 'פג הזמן לקבלת המיקום';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const handleTrackingUpdate = async (status) => {
    setLoading(true);
    setError(null);

    try {
      // Get current location
      const location = await getCurrentLocation();
      
      // Update tracking status
      const result = await volunteerAssignmentAPI.updateTrackingStatus(
        assignment.id,
        status,
        location.latitude,
        location.longitude,
        null // notes
      );

      // Update local tracking info
      await fetchTrackingInfo();
      
      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate(status, result);
      }

      setError(null);
    } catch (err) {
      console.error('Error updating tracking status:', err);
      setError(err.message || 'שגיאה בעדכון הסטטוס');
    } finally {
      setLoading(false);
      setLocationStatus('idle');
    }
  };

  const getButtonConfig = () => {
    const currentResponseType = trackingInfo?.response_type || assignment.response_type || 'assigned';
    
    switch (currentResponseType) {
      case 'assigned':
        return {
          nextStatus: 'departure',
          buttonText: 'יציאה',
          buttonColor: 'primary',
          icon: '🚗',
          description: 'לחץ כשאתה יוצא למשימה'
        };
      case 'departure':
        return {
          nextStatus: 'arrived_at_scene',
          buttonText: 'הגעתי למקום',
          buttonColor: 'warning',
          icon: '📍',
          description: 'לחץ כשהגעת למקום האירוע'
        };
      case 'arrived_at_scene':
        return {
          nextStatus: 'task_completed',
          buttonText: 'סיום',
          buttonColor: 'success',
          icon: '✅',
          description: 'לחץ כשסיימת את המשימה'
        };
      case 'task_completed':
        return null; // No more buttons needed
      default:
        return null;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'assigned': return 'default';
      case 'departure': return 'primary';
      case 'arrived_at_scene': return 'warning';
      case 'task_completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'assigned': return 'משימה מוקצית';
      case 'departure': return 'בדרך למקום';
      case 'arrived_at_scene': return 'במקום האירוע';
      case 'task_completed': return 'משימה הושלמה';
      default: return status;
    }
  };

  const buttonConfig = getButtonConfig();
  const currentResponseType = trackingInfo?.response_type || assignment.response_type || 'assigned';

  // Hide the entire tracking box once task is completed
  if (currentResponseType === 'task_completed') {
    return null;
  }

  return (
    <Box sx={{ 
      p: 2, 
      border: 1, 
      borderColor: 'divider', 
      borderRadius: 2,
      bgcolor: 'background.paper',
      mb: 2
    }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationIcon />
        מעקב משימה
      </Typography>

      {/* Current Status Display */}
      <Box sx={{ mb: 2 }}>
        <Chip 
          label={getStatusText(currentResponseType)}
          color={getStatusChipColor(currentResponseType)}
          variant="outlined"
          sx={{ mb: 1 }}
        />
        
        {/* Timeline Display */}
        {trackingInfo && (
          <Box sx={{ mt: 1 }}>
            {trackingInfo.departure_time && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                🚗 יציאה: {formatTime(trackingInfo.departure_time)}
              </Typography>
            )}
            {trackingInfo.arrival_time && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                📍 הגעה: {formatTime(trackingInfo.arrival_time)}
              </Typography>
            )}
            {trackingInfo.completion_time && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                ✅ סיום: {formatTime(trackingInfo.completion_time)}
              </Typography>
            )}
            
            {/* Response Times */}
            {trackingInfo.response_times && Object.keys(trackingInfo.response_times).length > 0 && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <TimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  זמני תגובה:
                </Typography>
                {trackingInfo.response_times.travel_time_minutes && (
                  <Typography variant="caption" display="block">
                    זמן נסיעה: {trackingInfo.response_times.travel_time_minutes} דקות
                  </Typography>
                )}
                {trackingInfo.response_times.on_scene_time_minutes && (
                  <Typography variant="caption" display="block">
                    זמן במקום: {trackingInfo.response_times.on_scene_time_minutes} דקות
                  </Typography>
                )}
                {trackingInfo.response_times.total_response_time_minutes && (
                  <Typography variant="caption" display="block">
                    זמן כולל: {trackingInfo.response_times.total_response_time_minutes} דקות
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Location Status */}
      {locationStatus === 'requesting' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            מקבל מיקום GPS...
          </Box>
        </Alert>
      )}

      {locationStatus === 'denied' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          יש לאפשר גישה למיקום כדי לבצע מעקב
        </Alert>
      )}

      {/* Action Button */}
      {buttonConfig && (
        <Box>
          <Button
            variant="contained"
            color={buttonConfig.buttonColor}
            fullWidth
            size="large"
            onClick={() => handleTrackingUpdate(buttonConfig.nextStatus)}
            disabled={loading || locationStatus === 'requesting'}
            startIcon={loading ? <CircularProgress size={20} /> : <span>{buttonConfig.icon}</span>}
            sx={{ 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'מעדכן...' : buttonConfig.buttonText}
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            {buttonConfig.description}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TrackingButtons;
