import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import debounce from 'lodash.debounce';
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
  Paper,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
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

// Add custom CSS for status indicators
const customStyles = `
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 4px;
  }
  .status-online {
    background-color: #2ecc71;
  }
  .status-tracking {
    background-color: #e74c3c;
  }
  .status-offline {
    background-color: #95a5a6;
  }
  .user-popup {
    max-width: 250px;
  }
  .role-chip {
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 8px;
    display: inline-block;
  }
  .info-item {
    margin-bottom: 4px;
    font-size: 12px;
  }
  .vehicle-info {
    background-color: #f8f9fa;
    padding: 4px 6px;
    border-radius: 4px;
    border-left: 3px solid #3498db;
  }
  .event-popup {
    max-width: 280px;
  }
`;

// Inject styles only once
if (typeof document !== 'undefined') {
  // Check if styles are already injected to prevent duplicates
  if (!document.getElementById('live-tracking-map-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'live-tracking-map-styles';
    styleSheet.type = 'text/css';
    styleSheet.innerText = customStyles;
    document.head.appendChild(styleSheet);
  }
}

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Optimized custom marker icons
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

// Custom profile photo icon for users
const createProfilePhotoIcon = (photoUrl, status, isHighlighted = false, isLive = true) => {
  const defaultAvatar = '/api/placeholder/40/40'; // Fallback placeholder
  const borderColor = status === 'tracking' ? '#e74c3c' : 
                     status === 'arrived' ? '#2ecc71' : 
                     status === 'offline' ? '#95a5a6' : '#3498db';
  
  const iconHtml = `
    <div style="
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: ${isHighlighted ? '4px solid #ff4081' : `3px solid ${borderColor}`};
      box-shadow: ${isHighlighted ? '0 4px 16px rgba(255,64,129,0.6)' : '0 3px 10px rgba(0,0,0,0.4)'};
      overflow: hidden;
      background-color: #f0f0f0;
      ${isHighlighted ? 'animation: pulse 2s infinite;' : ''}
      position: relative;
      ${!isLive ? 'opacity: 0.7; filter: grayscale(30%);' : ''}
    ">
      <img 
        src="${photoUrl || defaultAvatar}" 
        style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        "
        onerror="this.src='${defaultAvatar}'"
      />
      ${status === 'tracking' ? `
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background-color: #e74c3c;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
        ">🚗</div>
      ` : ''}
      ${status === 'arrived' ? `
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background-color: #2ecc71;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
        ">📍</div>
      ` : ''}
      ${status === 'offline' ? `
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background-color: #95a5a6;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
        ">💤</div>
      ` : ''}
      ${!isLive ? `
        <div style="
          position: absolute;
          top: -2px;
          left: -2px;
          background-color: #f39c12;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          border: 2px solid white;
        "></div>
      ` : ''}
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'profile-photo-marker',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -23]
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
  const [highlightTimeout, setHighlightTimeout] = useState(null);
  const [lastKnownUsers, setLastKnownUsers] = useState(new Map()); // Keep track of last known positions
  const mapRef = useRef(null); // Reference to map for performance optimizations
  
  // Flag movement confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    eventId: null,
    originalPosition: null,
    newPosition: null,
    originalAddress: '',
    newAddress: '',
    marker: null
  });

  // Map Focus Controller Component with persistent tracking
  const MapFocusController = ({ focusTarget, onFocusComplete, highlightedUser, usersWithLocations, lastKnownUsers }) => {
    const map = useMap();
    const lastTrackedPosition = useRef(null);

    // Initial focus when user is selected
    useEffect(() => {
      if (focusTarget && focusTarget.lat && focusTarget.lng) {
        map.setView([focusTarget.lat, focusTarget.lng], 16, {
          animate: true,
          duration: 1.5
        });
        
        // Store the initial position
        lastTrackedPosition.current = { lat: focusTarget.lat, lng: focusTarget.lng };
        
        // Call completion callback after animation
        const timer = setTimeout(() => {
          if (onFocusComplete) {
            onFocusComplete();
          }
        }, 1500);

        return () => clearTimeout(timer);
      }
    }, [map, focusTarget, onFocusComplete]);

    // Enhanced continuous tracking with better error handling and user retention
    useEffect(() => {
      if (!highlightedUser || !usersWithLocations || usersWithLocations.length === 0) {
        return;
      }

      // Find the highlighted user with better fallback logic
      let highlightedUserData = usersWithLocations.find(u => u.volunteer_id === highlightedUser);
      
      // If user not found in current list, check lastKnownUsers as fallback
      if (!highlightedUserData) {
        const fallbackUser = Array.from(lastKnownUsers.values()).find(u => u.volunteer_id === highlightedUser);
        if (fallbackUser) {
          highlightedUserData = fallbackUser;
          console.log('📍 Using fallback position for user:', fallbackUser.name);
        }
      }
      
      if (!highlightedUserData || !highlightedUserData.latitude || !highlightedUserData.longitude) {
        console.log('⚠️ No valid position data for highlighted user:', highlightedUser);
        return;
      }

      const userLat = highlightedUserData.latitude;
      const userLng = highlightedUserData.longitude;
      
      // Enhanced coordinate validation
      if (isNaN(userLat) || isNaN(userLng) || userLat === 0 || userLng === 0 ||
          userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
        console.log('⚠️ Invalid coordinates for user:', highlightedUserData.name, userLat, userLng);
        return;
      }
      
      // Check if user position actually changed significantly
      const lastPos = lastTrackedPosition.current;
      let shouldUpdate = false;
      
      if (!lastPos) {
        shouldUpdate = true;
      } else {
        const latDiff = Math.abs(lastPos.lat - userLat);
        const lngDiff = Math.abs(lastPos.lng - userLng);
        // Only update if user moved more than ~20 meters to prevent excessive updates
        shouldUpdate = latDiff > 0.0002 || lngDiff > 0.0002;
      }
      
      if (shouldUpdate) {
        // Use a timeout to debounce rapid updates
        const timeoutId = setTimeout(() => {
          try {
            const currentZoom = map.getZoom();
            map.setView([userLat, userLng], Math.max(currentZoom, 14), {
              animate: true,
              duration: 0.8
            });
            
            // Update the last tracked position
            lastTrackedPosition.current = { lat: userLat, lng: userLng };
          } catch (error) {
            console.error('Error updating map view:', error);
          }
        }, 500); // 500ms debounce
        
        return () => clearTimeout(timeoutId);
      }
    }, [map, highlightedUser, usersWithLocations, lastKnownUsers]);

    // Clear tracking position when user is deselected
    useEffect(() => {
      if (!highlightedUser) {
        lastTrackedPosition.current = null;
      }
    }, [highlightedUser]);

    return null;
  };

  // Function to handle flag movement confirmation
  const handleFlagDragStart = (event, marker) => {
    // Store original position when drag starts
    const originalPosition = marker.getLatLng();
    setConfirmDialog(prev => ({
      ...prev,
      eventId: event.id,
      originalPosition: originalPosition,
      originalAddress: event.full_address || 'כתובת לא ידועה',
      marker: marker
    }));
  };

  const handleFlagDragEnd = async (event, marker) => {
    const newPosition = marker.getLatLng();
    const originalPosition = confirmDialog.originalPosition;
    
    // Check if the position actually changed significantly (more than ~10 meters)
    if (originalPosition && 
        (Math.abs(originalPosition.lat - newPosition.lat) > 0.0001 || 
         Math.abs(originalPosition.lng - newPosition.lng) > 0.0001)) {
      
      try {
        // Get new address for the coordinates using reverse geocoding
        const newAddress = await geocodingService.coordinatesToAddress(newPosition.lat, newPosition.lng);
        
        // Update dialog with new position and address
        setConfirmDialog(prev => ({
          ...prev,
          newPosition: newPosition,
          newAddress: newAddress || 'לא ניתן לקבוע כתובת',
          open: true
        }));
        
      } catch (error) {
        console.error('Error getting new address:', error);
        setConfirmDialog(prev => ({
          ...prev,
          newPosition: newPosition,
          newAddress: 'שגיאה בקבלת כתובת',
          open: true
        }));
      }
    }
  };

  const handleConfirmMove = async () => {
    try {
      await updateEventCoordinates(
        confirmDialog.eventId, 
        confirmDialog.newPosition.lat, 
        confirmDialog.newPosition.lng
      );
      setConfirmDialog({ open: false, eventId: null, originalPosition: null, newPosition: null, originalAddress: '', newAddress: '', marker: null });
    } catch (error) {
      console.error('Error updating event coordinates:', error);
      // Revert marker position on error
      if (confirmDialog.marker && confirmDialog.originalPosition) {
        confirmDialog.marker.setLatLng(confirmDialog.originalPosition);
      }
      setConfirmDialog({ open: false, eventId: null, originalPosition: null, newPosition: null, originalAddress: '', newAddress: '', marker: null });
    }
  };

  const handleCancelMove = () => {
    // Revert marker to original position
    if (confirmDialog.marker && confirmDialog.originalPosition) {
      confirmDialog.marker.setLatLng(confirmDialog.originalPosition);
    }
    setConfirmDialog({ open: false, eventId: null, originalPosition: null, newPosition: null, originalAddress: '', newAddress: '', marker: null });
  };
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

  // Removed excessive debug logging that was causing performance issues

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
    };
  }, [highlightTimeout]);

  // Throttled version of loadActiveTracking to prevent excessive API calls
  const loadActiveTracking = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load both tracking data and active events with coordinates
      const [tracking, events] = await Promise.all([
        volunteerAssignmentAPI.getActiveTracking(),
        volunteerAssignmentAPI.getActiveEventsWithCoordinates()
      ]);
      
      // Only update state if data length actually changed to reduce re-renders
      setActiveTracking(prevTracking => {
        // Simple comparison - only update if count changed
        if (prevTracking.length !== tracking.length) {
          return tracking;
        }
        
        // Check if any tracking IDs changed
        const prevIds = new Set(prevTracking.map(t => t.assignment_id));
        const newIds = new Set(tracking.map(t => t.assignment_id));
        
        if (prevIds.size !== newIds.size || 
            [...prevIds].some(id => !newIds.has(id))) {
          return tracking;
        }
        
        return prevTracking;
      });
      
      setActiveEvents(prevEvents => {
        // Simple comparison for events
        if (prevEvents.length !== events.length) {
          return events;
        }
        
        // Check if any event IDs changed
        const prevIds = new Set(prevEvents.map(e => e.id));
        const newIds = new Set(events.map(e => e.id));
        
        if (prevIds.size !== newIds.size || 
            [...prevIds].some(id => !newIds.has(id))) {
          return events;
        }
        
        return prevEvents;
      });
      
      setError(null);
    } catch (err) {
      console.error('Error loading active tracking and events:', err);
      setError('שגיאה בטעינת נתוני מעקב ואירועים');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize component and set up refresh interval with performance optimization
  useEffect(() => {
    loadActiveTracking();
    
    // Performance optimization: adjust refresh interval based on user count
    const getRefreshInterval = () => {
      if (onlineUsers.length > 50) return 180000; // 3 minutes for many users
      if (onlineUsers.length > 30) return 150000; // 2.5 minutes for moderate users
      return 120000; // 2 minutes for few users
    };
    
    const interval = setInterval(loadActiveTracking, getRefreshInterval());
    return () => clearInterval(interval);
  }, [loadActiveTracking, onlineUsers.length]);

  // Throttled map update handler for performance optimization
  const throttledMapUpdate = useCallback(
    debounce(() => {
      // Gentle map update without forced re-render
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize();
        } catch (error) {
          console.warn('Map update warning:', error);
        }
      }
    }, onlineUsers.length > 20 ? 2000 : 1000), // Longer throttling with many users
    [onlineUsers.length]
  );

  // Performance monitoring effect
  useEffect(() => {
    if (onlineUsers.length > 30) {
      console.log(`🚦 Performance mode: ${onlineUsers.length} users online, using optimized rendering`);
    }
  }, [onlineUsers.length]);

  // Function to focus on a user when clicked in the list - toggle behavior with persistent focus
  const focusOnUser = useCallback((userItem) => {
    let lat, lng, userId;
    
    // Check if it's an online user or active tracking
    if (userItem.last_latitude && userItem.last_longitude) {
      lat = parseFloat(userItem.last_latitude);
      lng = parseFloat(userItem.last_longitude);
      userId = userItem.id;
    } else if (userItem.current_latitude && userItem.current_longitude) {
      lat = parseFloat(userItem.current_latitude);
      lng = parseFloat(userItem.current_longitude);
      userId = userItem.volunteer_id;
    }
    
    // If clicking on the same user that's already highlighted, deselect them
    if (highlightedUser === userId) {
      setHighlightedUser(null);
      setFocusTarget(null);
      
      // Clear any existing timeout
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        setHighlightTimeout(null);
      }
      return;
    }
    
    // Otherwise, focus on the new user with persistent selection
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setFocusTarget({ lat, lng });
      setHighlightedUser(userId);
      
      // Clear any existing timeout - focus stays until manually deselected
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        setHighlightTimeout(null);
      }
    }
  }, [highlightedUser, highlightTimeout]);

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

  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  // Enhanced user locations with performance optimizations for many users
  const usersWithLocations = useMemo(() => {
    const users = [];
    const trackingUserIds = new Set(activeTracking.map(t => t.volunteer_id));
    
    // Performance optimization: limit the number of users shown on map to prevent overwhelming
    const MAX_MAP_USERS = 50; // Limit to 50 users to maintain performance
    let userCount = 0;
    
    // Add online users (if they have last known location and are not currently tracking)
    onlineUsers.forEach(onlineUser => {
      if (userCount >= MAX_MAP_USERS) return; // Performance limit
      
      if (onlineUser.last_latitude && onlineUser.last_longitude && !trackingUserIds.has(onlineUser.id)) {
        const lat = parseFloat(onlineUser.last_latitude);
        const lng = parseFloat(onlineUser.last_longitude);
        
        // Only add if coordinates are valid - enhanced validation
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && 
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const userObj = {
            id: `online_${onlineUser.id}`,
            volunteer_id: onlineUser.id,
            name: onlineUser.full_name || onlineUser.username || 'משתמש',
            role: onlineUser.role,
            phone: onlineUser.phone_number,
            photo_url: onlineUser.photo_url,
            latitude: lat,
            longitude: lng,
            status: 'online',
            type: 'online',
            lastSeen: new Date(),
            isLive: true,
            // Vehicle information
            has_car: onlineUser.has_car,
            car_type: onlineUser.car_type,
            license_plate: onlineUser.license_plate,
            car_color: onlineUser.car_color
          };
          
          users.push(userObj);
          userCount++;
        }
      }
    });
    
    // Add tracking users (priority over online status) - these always get priority
    activeTracking.forEach(tracking => {
      if (tracking.current_latitude && tracking.current_longitude) {
        const lat = parseFloat(tracking.current_latitude);
        const lng = parseFloat(tracking.current_longitude);
        
        // Enhanced coordinate validation for tracking users
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && 
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const userObj = {
            id: `tracking_${tracking.assignment_id}`,
            volunteer_id: tracking.volunteer_id,
            name: tracking.volunteer?.full_name || tracking.volunteer?.username || 'מתנדב',
            role: tracking.volunteer?.role,
            phone: tracking.volunteer?.phone_number,
            photo_url: tracking.volunteer?.photo_url,
            latitude: lat,
            longitude: lng,
            status: tracking.status,
            type: 'tracking',
            lastSeen: new Date(),
            isLive: true,
            event: tracking.event,
            departure_time: tracking.departure_time,
            arrival_time: tracking.arrival_time
          };
          
          users.push(userObj);
        }
      }
    });
    
    // Extended grace period: keep users for 10 minutes instead of 5 (reduces disappearing users)
    // But limit offline users to prevent performance issues
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const currentUserIds = new Set([
      ...onlineUsers.map(u => u.id),
      ...activeTracking.map(t => t.volunteer_id)
    ]);
    
    let offlineUserCount = 0;
    const MAX_OFFLINE_USERS = 20; // Limit offline users for performance
    
    lastKnownUsers.forEach((lastUser, userId) => {
      if (offlineUserCount >= MAX_OFFLINE_USERS) return; // Performance limit
      
      if (!currentUserIds.has(userId) && lastUser.lastSeen > tenMinutesAgo) {
        // User is temporarily offline but was seen recently, keep showing with "offline" status
        const offlineUser = {
          ...lastUser,
          isLive: false,
          status: 'temporarily_disconnected'
        };
        users.push(offlineUser);
        offlineUserCount++;
      }
    });

    // Log performance info when there are many users
    if (onlineUsers.length > 30) {
      console.log(`📊 Performance mode: ${onlineUsers.length} online users, showing ${userCount} on map (limit: ${MAX_MAP_USERS})`);
    }

    return users;
  }, [onlineUsers, activeTracking, lastKnownUsers]); // Added lastKnownUsers for better stability  // Enhanced user tracking with better stability and reduced disappearing users
  useEffect(() => {
    const currentUsers = new Map();
    
    // Only process if we have valid data to prevent unnecessary updates
    if (!onlineUsers || !Array.isArray(onlineUsers)) {
      return;
    }
    
    // Collect current users with enhanced validation
    onlineUsers.forEach(onlineUser => {
      if (onlineUser && onlineUser.last_latitude && onlineUser.last_longitude) {
        const lat = parseFloat(onlineUser.last_latitude);
        const lng = parseFloat(onlineUser.last_longitude);
        
        // Enhanced coordinate validation - reject invalid coordinates
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && 
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const userObj = {
            id: `online_${onlineUser.id}`,
            volunteer_id: onlineUser.id,
            name: onlineUser.full_name || onlineUser.username || 'משתמש',
            role: onlineUser.role,
            phone: onlineUser.phone_number,
            photo_url: onlineUser.photo_url,
            latitude: lat,
            longitude: lng,
            status: 'online',
            type: 'online',
            lastSeen: new Date(),
            isLive: true,
            has_car: onlineUser.has_car,
            car_type: onlineUser.car_type,
            license_plate: onlineUser.license_plate,
            car_color: onlineUser.car_color
          };
          
          currentUsers.set(userObj.volunteer_id, userObj);
        }
      }
    });
    
    // Process tracking users only if we have valid data
    if (activeTracking && Array.isArray(activeTracking)) {
      activeTracking.forEach(tracking => {
        if (tracking && tracking.current_latitude && tracking.current_longitude) {
          const lat = parseFloat(tracking.current_latitude);
          const lng = parseFloat(tracking.current_longitude);
          
          // Enhanced coordinate validation for tracking users
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && 
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            const userObj = {
              id: `tracking_${tracking.assignment_id}`,
              volunteer_id: tracking.volunteer_id,
              name: tracking.volunteer?.full_name || tracking.volunteer?.username || 'מתנדב',
              role: tracking.volunteer?.role,
              phone: tracking.volunteer?.phone_number,
              photo_url: tracking.volunteer?.photo_url,
              latitude: lat,
              longitude: lng,
              status: tracking.status,
              type: 'tracking',
              lastSeen: new Date(),
              isLive: true,
              event: tracking.event,
              departure_time: tracking.departure_time,
              arrival_time: tracking.arrival_time
            };
            
            currentUsers.set(userObj.volunteer_id, userObj);
          }
        }
      });
    }

    // Enhanced user persistence logic
    setLastKnownUsers(prevMap => {
      const newMap = new Map(prevMap);
      
      // Add/update current users - only if they have valid coordinates
      currentUsers.forEach((user, userId) => {
        newMap.set(userId, user);
      });
      
      // Extended cleanup: Remove users that haven't been seen for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      newMap.forEach((user, userId) => {
        if (user.lastSeen < tenMinutesAgo) {
          newMap.delete(userId);
          console.log('🗑️ Removed stale user from memory:', user.name, 'last seen:', user.lastSeen);
        }
      });
      
      return newMap;
    });
  }, [onlineUsers, activeTracking]);

  // Check if highlighted user is still available, if not clear the highlight
  useEffect(() => {
    if (highlightedUser) {
      const highlightedUserExists = usersWithLocations.some(user => user.volunteer_id === highlightedUser);
      
      if (!highlightedUserExists) {
        // Removed debug logging for performance
        setHighlightedUser(null);
        if (highlightTimeout) {
          clearTimeout(highlightTimeout);
          setHighlightTimeout(null);
        }
      }
    }
  }, [usersWithLocations, highlightedUser, highlightTimeout]);

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
                  {usersWithLocations.filter(u => !u.isLive && u.type === 'online').length > 0 && (
                    <Chip 
                      label={`${usersWithLocations.filter(u => !u.isLive && u.type === 'online').length} מנותקים זמנית`}
                      color="warning"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                    />
                  )}
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
                          מחוברים ({onlineUsers.length + usersWithLocations.filter(u => !u.isLive && u.type === 'online').length})
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
                        {onlineUsers.concat(
                          usersWithLocations
                            .filter(u => !u.isLive && u.type === 'online')
                            .map(u => ({
                              id: u.volunteer_id,
                              full_name: u.name,
                              username: u.name,
                              role: u.role,
                              phone_number: u.phone,
                              photo_url: u.photo_url,
                              last_latitude: u.latitude,
                              last_longitude: u.longitude,
                              isOffline: true
                            }))
                        ).map((onlineUser, index) => (
                          <React.Fragment key={onlineUser.id}>
                            <ListItem 
                              sx={{ 
                                px: { xs: 1, md: 0 }, 
                                py: { xs: 1.5, md: 2 },
                                borderRadius: 2,
                                cursor: 'pointer',
                                backgroundColor: highlightedUser === onlineUser.id ? '#e3f2fd' : 'transparent',
                                border: highlightedUser === onlineUser.id ? '2px solid #2196f3' : '2px solid transparent',
                                '&:hover': { backgroundColor: '#f8f9fa' },
                                opacity: onlineUser.isOffline ? 0.7 : 1,
                                transform: highlightedUser === onlineUser.id ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => focusOnUser(onlineUser)}
                            >
                              <ListItemIcon>
                                <Box sx={{ position: 'relative' }}>
                                  <Avatar 
                                    src={onlineUser.photo_url}
                                    sx={{ 
                                      width: 40, 
                                      height: 40,
                                      bgcolor: !onlineUser.photo_url ? getRoleColor(onlineUser.role) : 'transparent',
                                      fontSize: '1rem',
                                      fontWeight: 600,
                                      filter: onlineUser.isOffline ? 'grayscale(30%)' : 'none'
                                    }}
                                  >
                                    {!onlineUser.photo_url && (onlineUser.full_name || onlineUser.username || 'U').charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box sx={{
                                    position: 'absolute',
                                    bottom: 2,
                                    right: 2,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: onlineUser.isOffline ? '#95a5a6' : '#2ecc71',
                                    border: '2px solid white'
                                  }} />
                                  {onlineUser.isOffline && (
                                    <Box sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      backgroundColor: '#f39c12',
                                      border: '2px solid white'
                                    }} />
                                  )}
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
                                          color: 'white',
                                          opacity: onlineUser.isOffline ? 0.7 : 1
                                        }}
                                      />
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <OnlineIcon sx={{ fontSize: 12, color: onlineUser.isOffline ? '#95a5a6' : '#2ecc71' }} />
                                        <Typography variant="caption" color="text.secondary">
                                          {onlineUser.isOffline ? 'מנותק זמנית' : 'מחובר'}
                                        </Typography>
                                      </Box>
                                      {onlineUser.phone_number && (
                                        <Typography variant="caption" color="text.secondary">
                                          📞 {onlineUser.phone_number}
                                        </Typography>
                                      )}
                                      {(onlineUser.last_latitude && onlineUser.last_longitude) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <FocusIcon sx={{ fontSize: 12, color: highlightedUser === onlineUser.id ? '#ff4081' : '#2196f3' }} />
                                          <Typography variant="caption" color={highlightedUser === onlineUser.id ? '#ff4081' : '#2196f3'}>
                                            {highlightedUser === onlineUser.id ? 'נבחר - לחץ לביטול' : 
                                             (onlineUser.isOffline ? 'מיקום אחרון' : 'לחץ למעקב')}
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
                                border: highlightedUser === tracking.volunteer_id ? '2px solid #2196f3' : '2px solid transparent',
                                '&:hover': { backgroundColor: '#f8f9fa' },
                                transform: highlightedUser === tracking.volunteer_id ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => focusOnUser(tracking)}
                            >
                              <ListItemIcon>
                                <Box sx={{ position: 'relative' }}>
                                  <Avatar 
                                    src={tracking.volunteer_photo_url}
                                    sx={{ 
                                      width: 40, 
                                      height: 40,
                                      bgcolor: !tracking.volunteer_photo_url ? '#3498db' : 'transparent',
                                      fontSize: '1rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    {!tracking.volunteer_photo_url && (tracking.volunteer_name || 'U').charAt(0).toUpperCase()}
                                  </Avatar>
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
                                          <FocusIcon sx={{ fontSize: 12, color: highlightedUser === tracking.volunteer_id ? '#ff4081' : '#2196f3' }} />
                                          <Typography variant="caption" color={highlightedUser === tracking.volunteer_id ? '#ff4081' : '#2196f3'}>
                                            {highlightedUser === tracking.volunteer_id ? 'נבחר - לחץ לביטול' : 'לחץ למעקב'}
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
                  {currentTab === 0 ? ' מתעדכן בזמן אמת' : ' מתעדכן כל 20 שניות'}
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
                    ref={mapRef}
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
                    
                    {/* User Markers with performance optimization for many users */}
                    {usersWithLocations
                      .filter(userLocation => {
                        // Optimized validation to prevent crashes
                        if (!userLocation?.latitude || !userLocation?.longitude) return false;
                        
                        const lat = userLocation.latitude;
                        const lng = userLocation.longitude;
                        
                        return !isNaN(lat) && !isNaN(lng) &&
                               lat >= -90 && lat <= 90 &&
                               lng >= -180 && lng <= 180;
                      })
                      .slice(0, onlineUsers.length > 50 ? 50 : usersWithLocations.length) // Performance limit
                      .map((userLocation) => {
                        try {
                          return (
                            <Marker
                              key={userLocation.id}
                              position={[userLocation.latitude, userLocation.longitude]}
                              icon={createProfilePhotoIcon(
                                userLocation.photo_url,
                                userLocation.type === 'tracking' ? userLocation.status : userLocation.type,
                                highlightedUser === userLocation.volunteer_id,
                                userLocation.isLive
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
                                      className={`status-indicator ${
                                        userLocation.isLive ? 
                                          (userLocation.type === 'online' ? 'status-online' : 'status-tracking') : 
                                          'status-offline'
                                      }`}
                                    ></span>
                                    {userLocation.isLive ? 
                                      (userLocation.type === 'online' ? 'מחובר למערכת' : getStatusText(userLocation.status)) :
                                      userLocation.status === 'temporarily_disconnected' ? 
                                        'מנותק זמנית - מיקום אחרון' : 
                                        'לא מחובר (מיקום אחרון)'
                                    }
                                  </div>
                                  
                                  {userLocation.phone && (
                                    <div className="info-item">📞 {userLocation.phone}</div>
                                  )}
                                  {!userLocation.phone && (
                                    <div className="info-item" style={{ color: 'orange' }}>📞 לא זמין</div>
                                  )}
                                  
                                  {/* Vehicle Information */}
                                  {userLocation.has_car && (
                                    <div className="info-item vehicle-info">
                                      🚗 {userLocation.car_type && `${userLocation.car_type}`}
                                      {userLocation.license_plate && ` | ${userLocation.license_plate}`}
                                      {userLocation.car_color && ` | ${userLocation.car_color}`}
                                    </div>
                                  )}
                                  {userLocation.has_car === false && (
                                    <div className="info-item" style={{ color: 'orange' }}>🚗 אין רכב</div>
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
                          );
                        } catch (error) {
                          console.error('Error rendering marker for user:', userLocation.id, error);
                          // Skip rendering this marker instead of crashing the entire map
                          return null;
                        }
                      })}
                    
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
                          dragstart: (e) => {
                            const marker = e.target;
                            handleFlagDragStart(event, marker);
                          },
                          dragend: (e) => {
                            const marker = e.target;
                            handleFlagDragEnd(event, marker);
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
                    
                    {/* Focus Controller with persistent tracking */}
                    <MapFocusController 
                      focusTarget={focusTarget} 
                      onFocusComplete={() => setFocusTarget(null)}
                      highlightedUser={highlightedUser}
                      usersWithLocations={usersWithLocations}
                      lastKnownUsers={lastKnownUsers}
                    />
                  </MapContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Flag Movement Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelMove}
        aria-labelledby="confirm-move-dialog-title"
        aria-describedby="confirm-move-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="confirm-move-dialog-title">
          אישור העברת דגל
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-move-dialog-description" component="div">
            <Typography variant="body1" gutterBottom>
              האם אתה בטוח שברצונך להעביר את הדגל?
            </Typography>
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                מכתובת:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                {confirmDialog.originalAddress}
              </Typography>
              
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                לכתובת:
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {confirmDialog.newAddress}
              </Typography>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelMove} color="primary">
            ביטול
          </Button>
          <Button onClick={handleConfirmMove} color="primary" variant="contained">
            כן, העבר דגל
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiveTrackingMap;
