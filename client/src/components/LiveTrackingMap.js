import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  Paper
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  FiberManualRecord as OnlineIcon,
  Map as MapIcon,
  MyLocation as FocusIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import volunteerAssignmentAPI from '../utils/volunteerAssignmentAPI';
import api from '../utils/api';
import geocodingService from '../services/geocodingService';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import './LiveTrackingMap.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color, status, isHighlighted = false) => {
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: ${isHighlighted ? '4px solid #ff4081' : '3px solid white'};
      box-shadow: ${isHighlighted ? '0 4px 16px rgba(255,64,129,0.6)' : '0 2px 8px rgba(0,0,0,0.3)'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      ${isHighlighted ? 'animation: pulse 2s infinite;' : ''}
    ">
      ${status === 'tracking' ? '🚗' : status === 'arrived' ? '📍' : '👤'}
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Custom flag icon for events
const createEventFlagIcon = (status, isHighlighted = false) => {
  const color = status === 'פעיל' ? '#e74c3c' : 
               status === 'הוקצה' ? '#f39c12' : 
               status === 'בטיפול' ? '#3498db' : '#2ecc71';
  
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 6px;
      border: ${isHighlighted ? '4px solid #ff4081' : '3px solid white'};
      box-shadow: ${isHighlighted ? '0 4px 16px rgba(255,64,129,0.6)' : '0 3px 10px rgba(0,0,0,0.4)'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      ${isHighlighted ? 'animation: pulse 2s infinite;' : ''}
      position: relative;
    ">
      🚩
      <div style="
        position: absolute;
        bottom: -2px;
        right: -2px;
        background-color: white;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: ${color};
        font-weight: bold;
      ">!</div>
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-event-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const LiveTrackingMap = () => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [activeTracking, setActiveTracking] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [mapCenter, setMapCenter] = useState([32.0853, 34.7818]); // Tel Aviv default
  const [mapZoom, setMapZoom] = useState(10);
  const [focusTarget, setFocusTarget] = useState(null);
  const [highlightedUser, setHighlightedUser] = useState(null);

  // Map Focus Controller Component
  const MapFocusController = ({ focusTarget, onFocusComplete }) => {
    const map = useMap();

    useEffect(() => {
      if (focusTarget && focusTarget.lat && focusTarget.lng) {
        map.setView([focusTarget.lat, focusTarget.lng], 16, {
          animate: true,
          duration: 1.5
        });
        
        // Call completion callback after animation
        const timer = setTimeout(() => {
          if (onFocusComplete) {
            onFocusComplete();
          }
        }, 1500);

        return () => clearTimeout(timer);
      }
    }, [map, focusTarget, onFocusComplete]);

    return null;
  };

  // Function to update event coordinates when flag is dragged
  const updateEventCoordinates = async (eventId, newLat, newLng) => {
    try {
      console.log(`🚩 Updating event ${eventId} coordinates to:`, { lat: newLat, lng: newLng });
      
      // Get the new address for the coordinates using reverse geocoding
      console.log('🔄 Getting address for new coordinates...');
      const newAddress = await geocodingService.coordinatesToAddress(newLat, newLng);
      
      // Prepare update data
      const updateData = {
        event_latitude: newLat,
        event_longitude: newLng
      };
      
      // Include address if reverse geocoding was successful
      if (newAddress) {
        updateData.full_address = newAddress;
        console.log('✅ New address found:', newAddress);
      } else {
        console.log('⚠️ Could not get address for coordinates, updating coordinates only');
      }
      
      // Update the event coordinates (and address) via API
      const response = await api.put(`/api/admin/events/${eventId}`, updateData);

      console.log('✅ Event updated successfully');
      
      // Update local state to reflect the change
      setActiveEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                event_latitude: newLat, 
                event_longitude: newLng,
                ...(newAddress && { full_address: newAddress })
              }
            : event
        )
      );
      
      // Show success message with address info
      const message = newAddress 
        ? `📍 מיקום האירוע עודכן בהצלחה!\n🏠 כתובת חדשה: ${newAddress}`
        : '📍 קואורדינטות האירוע עודכנו בהצלחה!';
      
      alert(message);

    } catch (error) {
      console.error('❌ Error updating event coordinates:', error);
      alert('❌ שגיאה בעדכון מיקום האירוע');
    }
  };

  // Security check - only allow specific command roles
  const allowedRoles = ['מוקדן', 'מפקד משל"ט', 'פיקוד יחידה', 'אדמין', 'מפתח'];
  
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <Card sx={{ p: 3 }}>
        <Alert severity="error">
          ⚠️ אין לך הרשאה לצפות במעקב חי
          <br />
          <Typography variant="caption" color="text.secondary">
            מעקב חי זמין רק עבור: {allowedRoles.join(', ')}
          </Typography>
        </Alert>
      </Card>
    );
  }

  useEffect(() => {
    loadActiveTracking();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveTracking, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveTracking = async () => {
    try {
      setLoading(true);
      
      // Load both tracking data and active events with coordinates
      const [tracking, events] = await Promise.all([
        volunteerAssignmentAPI.getActiveTracking(),
        volunteerAssignmentAPI.getActiveEventsWithCoordinates()
      ]);
      
      // DEBUG: Let's also check regular events to see what exists
      try {
        const allEventsResponse = await fetch('/api/admin/events', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const allEvents = await allEventsResponse.json();
        console.log('🔍 DEBUG - All events in database:', allEvents);
        console.log('🔍 DEBUG - Active events:', allEvents.filter(e => 
          ['דווח', 'פעיל', 'הוקצה', 'בטיפול'].includes(e.event_status)
        ));
        console.log('🔍 DEBUG - Events with any coordinates:', allEvents.filter(e => 
          e.event_latitude || e.event_longitude
        ));
      } catch (debugError) {
        console.log('🔍 DEBUG - Error fetching all events:', debugError);
      }
      
      console.log('🗺️ Loaded active events for map:', events);
      console.log('🗺️ Total events loaded:', events.length);
      console.log('🗺️ Events with coordinates:', events.filter(e => e.event_latitude && e.event_longitude));
      console.log('🗺️ Valid coordinate events:', events.filter(e => 
        e.event_latitude && 
        e.event_longitude && 
        !isNaN(parseFloat(e.event_latitude)) && 
        !isNaN(parseFloat(e.event_longitude))
      ));
      
      setActiveTracking(tracking);
      setActiveEvents(events);
      setError(null);
    } catch (err) {
      console.error('Error loading active tracking and events:', err);
      setError('שגיאה בטעינת נתוני מעקב ואירועים');
    } finally {
      setLoading(false);
    }
  };

  // Function to focus on a user when clicked in the list
  const focusOnUser = (userItem) => {
    let lat, lng;
    
    // Check if it's an online user or active tracking
    if (userItem.last_latitude && userItem.last_longitude) {
      lat = parseFloat(userItem.last_latitude);
      lng = parseFloat(userItem.last_longitude);
    } else if (userItem.current_latitude && userItem.current_longitude) {
      lat = parseFloat(userItem.current_latitude);
      lng = parseFloat(userItem.current_longitude);
    }
    
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setFocusTarget({ lat, lng });
      setHighlightedUser(userItem.id || userItem.volunteer_id);
      
      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedUser(null);
      }, 5000);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'departure': return '#3498db';
      case 'arrived_at_scene': return '#f39c12';
      case 'task_completed': return '#27ae60';
      default: return '#2ecc71';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'departure': return 'בדרך למקום';
      case 'arrived_at_scene': return 'במקום האירוע';
      case 'task_completed': return 'הושלם';
      default: return status;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateElapsedTime = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.round((now - start) / (1000 * 60));
    return diffMinutes;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'מפתח': return '#9b59b6';
      case 'אדמין': return '#e74c3c';
      case 'פיקוד יחידה': return '#3498db';
      case 'מפקד משל"ט': return '#f39c12';
      case 'מוקדן': return '#2ecc71';
      case 'סייר': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Get all users with locations for map
  const getUsersWithLocations = () => {
    const users = [];
    
    // Add online users (if they have last known location)
    onlineUsers.forEach(onlineUser => {
      if (onlineUser.last_latitude && onlineUser.last_longitude) {
        users.push({
          id: `online_${onlineUser.id}`,
          name: onlineUser.full_name || onlineUser.username || 'משתמש',
          role: onlineUser.role,
          phone: onlineUser.phone_number,
          latitude: onlineUser.last_latitude,
          longitude: onlineUser.last_longitude,
          status: 'online',
          type: 'online'
        });
      }
    });
    
    // Add tracking users
    activeTracking.forEach(tracking => {
      if (tracking.current_latitude && tracking.current_longitude) {
        users.push({
          id: `tracking_${tracking.assignment_id}`,
          name: tracking.volunteer?.full_name || tracking.volunteer?.username || 'מתנדב',
          role: tracking.volunteer?.role,
          phone: tracking.volunteer?.phone_number,
          latitude: tracking.current_latitude,
          longitude: tracking.current_longitude,
          status: tracking.status,
          type: 'tracking',
          event: tracking.event,
          departure_time: tracking.departure_time,
          arrival_time: tracking.arrival_time
        });
      }
    });
    
    return users;
  };

  const usersWithLocations = getUsersWithLocations();

  if (loading && activeTracking.length === 0 && currentTab === 1) {
    return (
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>טוען נתוני מעקב...</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Box sx={{ 
      height: { xs: 'auto', md: '100%' },
      minHeight: { xs: '100vh', md: 'auto' }
    }}>
      <Grid container spacing={{ xs: 1, md: 2 }} sx={{ 
        height: { xs: 'auto', md: '100%' },
        flexDirection: { xs: 'column-reverse', md: 'row' }
      }}>
        {/* Left Panel - User Lists */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: { xs: 2, md: 3 },
            border: '1px solid #e0e6ed',
            height: { xs: 'auto', md: '100%' },
            maxHeight: { xs: '400px', md: 'none' },
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ 
              p: { xs: 2, md: 3 }, 
              flexGrow: 1, 
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2,
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: { xs: 1, md: 0 }
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#2c3e50',
                  fontSize: { xs: '1.1rem', md: '1.25rem' }
                }}>
                  📊 רשימת משתמשים
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${onlineUsers.length} מחוברים`}
                    color="success"
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  />
                  <Chip 
                    label={`${activeTracking.length} במשימות`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  />
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Tabs for switching between views */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={currentTab} 
                  onChange={handleTabChange}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTab-root': {
                      fontSize: { xs: '0.8rem', md: '0.875rem' },
                      minHeight: { xs: 40, md: 48 }
                    }
                  }}
                >
                  <Tab 
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 0.5, md: 1 },
                        flexDirection: { xs: 'column', sm: 'row' }
                      }}>
                        <OnlineIcon sx={{ fontSize: { xs: 14, md: 16 } }} />
                        <span style={{ fontSize: 'inherit' }}>
                          מחוברים ({onlineUsers.length})
                        </span>
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 0.5, md: 1 },
                        flexDirection: { xs: 'column', sm: 'row' }
                      }}>
                        <CarIcon sx={{ fontSize: { xs: 14, md: 16 } }} />
                        <span style={{ fontSize: 'inherit' }}>
                          במשימות ({activeTracking.length})
                        </span>
                      </Box>
                    } 
                  />
                </Tabs>
              </Box>

              {/* Lists Container */}
              <Box sx={{ 
                flexGrow: 1, 
                overflow: 'auto',
                maxHeight: { xs: '300px', md: 'none' }
              }}>
                {/* Online Users Tab */}
                {currentTab === 0 && (
                  <Box>
                    {onlineUsers.length === 0 ? (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4, 
                        color: 'text.secondary'
                      }}>
                        <OnlineIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          אין משתמשים מחוברים כרגע
                        </Typography>
                        <Typography variant="body2">
                          כאשר משתמשים יתחברו למערכת, הם יופיעו כאן
                        </Typography>
                      </Box>
                    ) : (
                      <List dense>
                        {onlineUsers.map((onlineUser, index) => (
                          <React.Fragment key={onlineUser.id}>
                            <ListItem 
                              sx={{ 
                                px: { xs: 1, md: 0 }, 
                                py: { xs: 1.5, md: 2 },
                                borderRadius: 2,
                                cursor: 'pointer',
                                backgroundColor: highlightedUser === onlineUser.id ? '#e3f2fd' : 'transparent',
                                '&:hover': { backgroundColor: '#f8f9fa' }
                              }}
                              onClick={() => focusOnUser(onlineUser)}
                            >
                              <ListItemIcon>
                                <Box sx={{ position: 'relative' }}>
                                  <PersonIcon sx={{ fontSize: 32, color: getRoleColor(onlineUser.role) }} />
                                  <Box sx={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: '#2ecc71',
                                    border: '2px solid white'
                                  }} />
                                </Box>
                              </ListItemIcon>
                              
                              <ListItemText
                                primary={
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                      {onlineUser.full_name || onlineUser.username || 'משתמש'}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                      <Chip 
                                        label={onlineUser.role}
                                        size="small"
                                        sx={{
                                          backgroundColor: getRoleColor(onlineUser.role),
                                          color: 'white'
                                        }}
                                      />
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <OnlineIcon sx={{ fontSize: 12, color: '#2ecc71' }} />
                                        <Typography variant="caption" color="text.secondary">
                                          מחובר
                                        </Typography>
                                      </Box>
                                      {onlineUser.phone_number && (
                                        <Typography variant="caption" color="text.secondary">
                                          📞 {onlineUser.phone_number}
                                        </Typography>
                                      )}
                                      {(onlineUser.last_latitude && onlineUser.last_longitude) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <FocusIcon sx={{ fontSize: 12, color: '#2196f3' }} />
                                          <Typography variant="caption" color="#2196f3">
                                            לחץ למיקום במפה
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < onlineUsers.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {/* Active Tracking Tab */}
                {currentTab === 1 && (
                  <Box>
                    {activeTracking.length === 0 ? (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4, 
                        color: 'text.secondary'
                      }}>
                        <LocationIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          אין משימות פעילות כרגע
                        </Typography>
                        <Typography variant="body2">
                          כאשר מתנדבים יצאו למשימות, המעקב שלהם יופיע כאן
                        </Typography>
                      </Box>
                    ) : (
                      <List dense>
                        {activeTracking.map((tracking, index) => (
                          <React.Fragment key={tracking.assignment_id}>
                            <ListItem 
                              sx={{ 
                                px: 0, 
                                py: 2,
                                borderRadius: 2,
                                cursor: 'pointer',
                                backgroundColor: highlightedUser === tracking.volunteer_id ? '#e3f2fd' : 'transparent',
                                '&:hover': { backgroundColor: '#f8f9fa' }
                              }}
                              onClick={() => focusOnUser(tracking)}
                            >
                              <ListItemIcon>
                                <Box sx={{ position: 'relative' }}>
                                  <PersonIcon sx={{ fontSize: 32, color: '#3498db' }} />
                                  <Box sx={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: getStatusColor(tracking.status),
                                    border: '2px solid white'
                                  }} />
                                </Box>
                              </ListItemIcon>
                              
                              <ListItemText
                                primary={
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                      {tracking.volunteer?.full_name || tracking.volunteer?.username || 'מתנדב'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      {tracking.event?.title} • {tracking.event?.full_address}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                      <Chip 
                                        label={getStatusText(tracking.status)}
                                        size="small"
                                        sx={{
                                          backgroundColor: getStatusColor(tracking.status),
                                          color: 'white'
                                        }}
                                      />
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary">
                                          יצא: {formatTime(tracking.departure_time)}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <CarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary">
                                          {calculateElapsedTime(tracking.departure_time)} דקות
                                        </Typography>
                                      </Box>
                                      {tracking.arrival_time && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <LocationIcon sx={{ fontSize: 16, color: '#f39c12' }} />
                                          <Typography variant="caption" color="text.secondary">
                                            הגיע: {formatTime(tracking.arrival_time)}
                                          </Typography>
                                        </Box>
                                      )}
                                      {(tracking.current_latitude && tracking.current_longitude) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <FocusIcon sx={{ fontSize: 12, color: '#2196f3' }} />
                                          <Typography variant="caption" color="#2196f3">
                                            לחץ למיקום במפה
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < activeTracking.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
              </Box>
              
              {/* Footer with last update info */}
              <Box sx={{ 
                mt: 2, 
                p: { xs: 1.5, md: 2 }, 
                backgroundColor: '#f8f9fa', 
                borderRadius: 2 
              }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                    flexWrap: 'wrap'
                  }}
                >
                  <TimeIcon sx={{ fontSize: { xs: 12, md: 14 } }} />
                  עדכון אחרון: {new Date().toLocaleTimeString('he-IL')} • 
                  {currentTab === 0 ? ' מתעדכן בזמן אמת' : ' מתעדכן כל 30 שניות'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel - Map */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            borderRadius: { xs: 2, md: 3 },
            border: '1px solid #e0e6ed',
            height: { xs: '500px', md: '100%' },
            minHeight: { xs: '500px', md: 'auto' },
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ 
              p: { xs: 2, md: 3 }, 
              flexGrow: 1, 
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2,
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: { xs: 1, md: 0 }
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#2c3e50',
                  fontSize: { xs: '1.1rem', md: '1.25rem' }
                }}>
                  🗺️ מפת מעקב חי
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${usersWithLocations.length} מיקומים במפה`}
                    color="info"
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  />
                  <Chip 
                    label={`${activeEvents.length} אירועים פעילים`}
                    color="error"
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  />
                </Box>
              </Box>

              {/* Map Container */}
              <Box sx={{ 
                flexGrow: 1, 
                borderRadius: 2, 
                overflow: 'hidden', 
                minHeight: { xs: '400px', md: '400px' },
                height: { xs: '450px', md: 'auto' }
              }}>
                {usersWithLocations.length === 0 && activeEvents.length === 0 ? (
                  <Box sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa',
                    color: 'text.secondary'
                  }}>
                    <MapIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      אין נתוני מיקום זמינים
                    </Typography>
                    <Typography variant="body2" textAlign="center">
                      כאשר משתמשים יהיו עם מיקומי GPS פעילים<br />
                      או אירועים עם קואורדינטות,<br />
                      הם יופיעו כאן על המפה
                    </Typography>
                  </Box>
                ) : (
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    touchZoom={true}
                    doubleClickZoom={true}
                    scrollWheelZoom={true}
                    dragging={true}
                    zoomControl={true}
                    tap={true}
                    touchExtend={1}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {usersWithLocations.map((userLocation) => (
                      <Marker
                        key={userLocation.id}
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={createCustomIcon(
                          userLocation.type === 'online' ? '#2ecc71' : getStatusColor(userLocation.status),
                          userLocation.type === 'tracking' ? 'tracking' : 'online',
                          highlightedUser === (userLocation.volunteer_id || userLocation.id)
                        )}
                      >
                        <Popup>
                          <div className="user-popup">
                            <h4>{userLocation.name}</h4>
                            <div 
                              className="role-chip"
                              style={{ backgroundColor: getRoleColor(userLocation.role) }}
                            >
                              {userLocation.role}
                            </div>
                            <div className="info-item">
                              <span 
                                className={`status-indicator ${userLocation.type === 'online' ? 'status-online' : 'status-tracking'}`}
                              ></span>
                              {userLocation.type === 'online' ? 'מחובר למערכת' : getStatusText(userLocation.status)}
                            </div>
                            {userLocation.phone && (
                              <div className="info-item">📞 {userLocation.phone}</div>
                            )}
                            {userLocation.event && (
                              <>
                                <div className="info-item">
                                  <strong>משימה:</strong> {userLocation.event.title}
                                </div>
                                <div className="info-item">
                                  <strong>כתובת:</strong> {userLocation.event.full_address}
                                </div>
                                {userLocation.departure_time && (
                                  <div className="info-item">
                                    <strong>יצא:</strong> {formatTime(userLocation.departure_time)}
                                  </div>
                                )}
                                {userLocation.arrival_time && (
                                  <div className="info-item">
                                    <strong>הגיע:</strong> {formatTime(userLocation.arrival_time)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    
                    {/* Event Flag Markers */}
                    {activeEvents
                      .filter(event => 
                        event.event_latitude && 
                        event.event_longitude && 
                        !isNaN(parseFloat(event.event_latitude)) && 
                        !isNaN(parseFloat(event.event_longitude))
                      )
                      .map((event) => (
                      <Marker
                        key={`event_${event.id}`}
                        position={[parseFloat(event.event_latitude), parseFloat(event.event_longitude)]}
                        icon={createEventFlagIcon(event.event_status)}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            console.log(`🚩 Flag dragged for event ${event.id}:`, position);
                            updateEventCoordinates(event.id, position.lat, position.lng);
                          }
                        }}
                      >
                        <Popup>
                          <div className="event-popup">
                            <h4>🚩 {event.title}</h4>
                            <div 
                              className="status-chip"
                              style={{ 
                                backgroundColor: event.event_status === 'פעיל' ? '#e74c3c' : 
                                                event.event_status === 'הוקצה' ? '#f39c12' : 
                                                event.event_status === 'בטיפול' ? '#3498db' : '#2ecc71',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                display: 'inline-block'
                              }}
                            >
                              {event.event_status}
                            </div>
                            
                            {/* Draggable hint */}
                            <div style={{
                              backgroundColor: '#f8f9fa',
                              padding: '6px 8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: '#6c757d',
                              marginBottom: '8px',
                              border: '1px dashed #dee2e6'
                            }}>
                              🖱️ ניתן לגרור את הדגל למיקום אחר<br/>
                              📍 הכתובת תתעדכן אוטומטית
                            </div>
                            
                            <div className="info-item">
                              <strong>📍 כתובת:</strong> {event.full_address}
                            </div>
                            <div className="info-item">
                              <strong>🚗 רכב:</strong> {event.license_plate} ({event.car_model} {event.car_color})
                            </div>
                            <div className="info-item">
                              <strong>📊 מצב רכב:</strong> {event.car_status}
                            </div>
                            <div className="info-item">
                              <strong>👨‍💼 יוצר:</strong> {event.creator?.full_name || event.creator?.username || 'לא ידוע'}
                            </div>
                            <div className="info-item">
                              <strong>📅 נוצר:</strong> {new Date(event.created_at).toLocaleDateString('he-IL')} {new Date(event.created_at).toLocaleTimeString('he-IL')}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    
                    {/* Focus Controller */}
                    <MapFocusController 
                      focusTarget={focusTarget} 
                      onFocusComplete={() => setFocusTarget(null)} 
                    />
                  </MapContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveTrackingMap;
