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
import { volunteerAssignmentAPI } from '../utils/volunteerAssignmentAPI';
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

const LiveTrackingMap = () => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [activeTracking, setActiveTracking] = useState([]);
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
      const tracking = await volunteerAssignmentAPI.getActiveTracking();
      setActiveTracking(tracking);
      setError(null);
    } catch (err) {
      console.error('Error loading active tracking:', err);
      setError('שגיאה בטעינת נתוני מעקב');
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
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Left Panel - User Lists */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 3,
            border: '1px solid #e0e6ed',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  � רשימת משתמשים
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`${onlineUsers.length} מחוברים`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                  <Chip 
                    label={`${activeTracking.length} במשימות`}
                    color="primary"
                    variant="outlined"
                    size="small"
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
                <Tabs value={currentTab} onChange={handleTabChange}>
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <OnlineIcon sx={{ fontSize: 16 }} />
                        מחוברים ({onlineUsers.length})
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CarIcon sx={{ fontSize: 16 }} />
                        במשימות ({activeTracking.length})
                      </Box>
                    } 
                  />
                </Tabs>
              </Box>

              {/* Lists Container */}
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
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
                                px: 0, 
                                py: 2,
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
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon sx={{ fontSize: 14 }} />
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
            borderRadius: 3,
            border: '1px solid #e0e6ed',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  🗺️ מפת מעקב חי
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`${usersWithLocations.length} מיקומים במפה`}
                    color="info"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Box>

              {/* Map Container */}
              <Box sx={{ flexGrow: 1, borderRadius: 2, overflow: 'hidden', minHeight: '400px' }}>
                {usersWithLocations.length === 0 ? (
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
                      כאשר משתמשים יהיו עם מיקומי GPS פעילים,<br />
                      הם יופיעו כאן על המפה
                    </Typography>
                  </Box>
                ) : (
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
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
