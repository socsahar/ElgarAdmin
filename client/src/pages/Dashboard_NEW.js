import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  FiberManualRecord as OnlineIcon,
  CleaningServices as CleanupIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import TrackingButtons from '../components/TrackingButtons';
import LiveTrackingMap from '../components/LiveTrackingMap';
import { useSocket } from '../contexts/SocketContext';
import api from '../utils/api';

function Dashboard() {
  const { user } = useAuth();
  const { socket, connected, onlineUsers, requestOnlineUsers } = useSocket();
  
  // Check if current user can view ID numbers
  const canViewIdNumbers = () => {
    if (!user) return false;
    const authorizedRoles = ['מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט'];
    return authorizedRoles.includes(user.role);
  };
  
  const [stats, setStats] = useState({
    pendingActionReports: 0,
    activeCases: 0,
    recoveredCars: 0,
    pendingReports: 0,
    userAssignments: []
  });
  const [activeTheftCases, setActiveTheftCases] = useState([]);
  const [closedTheftCases, setClosedTheftCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Event Details Modal State
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // User Details Modal State
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [userStatsCache, setUserStatsCache] = useState(new Map()); // Cache for user statistics
  const [showAllOnlineUsers, setShowAllOnlineUsers] = useState(false); // State for showing all online users

  useEffect(() => {
    loadDashboardData();
  }, []); // Run on component mount

  // Request online users when component mounts or socket becomes ready
  useEffect(() => {
    // Simple single request when socket is ready
    if (socket && connected) {
      console.log('🚀 Requesting online users (dashboard mount)');
      requestOnlineUsers();
    }
  }, [socket, connected]); // Removed requestOnlineUsers from deps to prevent loops

  // Set up visibility and focus handlers for refresh (with throttling)
  useEffect(() => {
    let lastRefreshTime = 0;
    const THROTTLE_MS = 5000; // Don't refresh more than once every 5 seconds

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (!document.hidden && socket && connected && (now - lastRefreshTime) > THROTTLE_MS) {
        console.log('👁️ Page became visible, refreshing online users (throttled)');
        lastRefreshTime = now;
        requestOnlineUsers();
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      if (socket && connected && (now - lastRefreshTime) > THROTTLE_MS) {
        console.log('🎯 Window gained focus, refreshing online users (throttled)');
        lastRefreshTime = now;
        requestOnlineUsers();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [socket, connected]); // Removed requestOnlineUsers from deps

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Import api utility
      const api = (await import('../utils/api')).default;
      
      // Fetch events from API
      const eventsResponse = await api.get('/api/admin/events');
      const events = eventsResponse.data || [];
      
      // Filter events by status
      const activeEvents = events.filter(event => 
        event.event_status && !['הסתיים', 'בוטל'].includes(event.event_status)
      );
      const closedEvents = events.filter(event => 
        event.event_status && ['הסתיים', 'בוטל'].includes(event.event_status)
      );
      
      // Update statistics
      setStats({
        pendingActionReports: 0, // TODO: Connect to action reports API
        activeCases: activeEvents.length,
        recoveredCars: closedEvents.length,
        pendingReports: 0, // TODO: Connect to pending reports API
      });

      // Transform events to match dashboard format
      const transformEvent = (event) => ({
        id: event.id,
        title: event.title,
        location: event.full_address,
        licensePlate: event.license_plate,
        description: event.details,
        status: event.event_status,
        createdAt: event.created_at,
        closedAt: event.event_status === 'הסתיים' ? event.updated_at : null,
        creator: event.creator?.full_name || event.creator?.username || 'לא ידוע',
        assignedVolunteers: event.assigned_volunteers || [],
        closure_reason: event.closure_reason,
        closed_at: event.closed_at,
        closed_by: event.closed_by
      });

      setActiveTheftCases(activeEvents.map(transformEvent));
      setClosedTheftCases(closedEvents.slice(0, 10).map(transformEvent)); // Show only last 10 closed cases
      
      // Load user assignments for volunteers
      let userAssignments = [];
      if (user) {
        try {
          const { default: volunteerAssignmentAPI } = await import('../utils/volunteerAssignmentAPI');
          userAssignments = await volunteerAssignmentAPI.getVolunteerAssignments(user.id);
          console.log('Loaded user assignments:', userAssignments.length, 'for user:', user.id, 'role:', user.role);
          console.log('Assignment details:', userAssignments);
        } catch (error) {
          console.error('Error loading user assignments:', error);
        }
      }

      // Update statistics with user assignments
      setStats({
        pendingActionReports: 0, // TODO: Connect to action reports API
        activeCases: activeEvents.length,
        recoveredCars: closedEvents.length,
        pendingReports: 0, // TODO: Connect to pending reports API
        userAssignments: userAssignments
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty data on error
      setStats({
        pendingActionReports: 0,
        activeCases: 0,
        recoveredCars: 0,
        pendingReports: 0,
        userAssignments: []
      });
      setActiveTheftCases([]);
      setClosedTheftCases([]);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    
    // Debug logging to see what user data we have
    console.log('Dashboard user data:', user);
    console.log('User full_name:', user?.full_name);
    console.log('User username:', user?.username);
    
    // Use only full_name, not username
    const name = user?.full_name || 'משתמש';
    
    if (hour < 12) return `בוקר טוב, ${name}`;
    if (hour < 18) return `צהריים טובים, ${name}`;
    return `ערב טוב, ${name}`;
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'מפתח': 'מפתח',
      'אדמין': 'אדמין',
      'פיקוד יחידה': 'פיקוד יחידה',
      'מפקד משל"ט': 'מפקד משל"ט',
      'מוקדן': 'מוקדן',
      'סייר': 'סייר',
    };
    return roleMap[role] || role;
  };

  // Event Details Modal Functions
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  const handleCloseModal = () => {
    setEventDetailsOpen(false);
    setSelectedEvent(null);
  };

  // User Details Modal Functions
  const handleUserClick = async (user) => {
    // Prevent multiple clicks while loading
    if (userStatsLoading) {
      console.log('User stats already loading, ignoring click');
      return;
    }

    console.log('User clicked:', user.id, user.full_name || user.username);
    
    // First, set the modal open with basic user data
    setSelectedUser(user);
    setUserDetailsOpen(true);
    setUserStatsLoading(true);
    
    try {
      // Fetch complete user data from the database
      console.log('Fetching complete user data for:', user.id);
      const userResponse = await api.get(`/api/users/${user.id}`);
      const completeUserData = userResponse.data;
      
      console.log('Complete user data fetched:', completeUserData);
      
      // Check cache for stats
      const cacheKey = user.id;
      let userStats = {};
      
      if (userStatsCache.has(cacheKey)) {
        console.log('Using cached user stats for:', user.id);
        userStats = userStatsCache.get(cacheKey);
      } else {
        // Fetch user statistics
        console.log('Fetching user statistics for:', user.id);
        
        const { default: volunteerAssignmentAPI } = await import('../utils/volunteerAssignmentAPI');
        
        // Get volunteer assignments for this user
        const assignments = await volunteerAssignmentAPI.getVolunteerAssignments(user.id);
        
        console.log('Received assignments:', assignments.length, 'for user:', user.id);
        
        // Calculate statistics
        const totalEvents = assignments.length;
        const completedEvents = assignments.filter(a => a.status === 'completed').length;
        const activeEvents = assignments.filter(a => ['assigned', 'accepted'].includes(a.status)).length;
        
        userStats = {
          totalEvents: totalEvents,
          activeEvents: activeEvents,
          completedEvents: completedEvents,
          totalReports: completedEvents, // Using completed assignments as proxy for reports
          hoursVolunteered: completedEvents * 2, // Estimate 2 hours per completed assignment
          assignments: assignments
        };
        
        // Cache the results for 5 minutes
        setUserStatsCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, userStats);
          // Clear cache after 5 minutes
          setTimeout(() => {
            setUserStatsCache(currentCache => {
              const updatedCache = new Map(currentCache);
              updatedCache.delete(cacheKey);
              return updatedCache;
            });
          }, 5 * 60 * 1000); // 5 minutes
          return newCache;
        });
      }
      
      // Update user object with complete data and statistics
      setSelectedUser({
        ...completeUserData, // Use complete user data from database
        ...userStats // Add statistics
      });
      
    } catch (error) {
      console.error('Error fetching user data or statistics:', error);
      // Set user with default values if API fails
      const defaultStats = {
        totalEvents: 0,
        activeEvents: 0,
        completedEvents: 0,
        totalReports: 0,
        hoursVolunteered: 0,
        assignments: []
      };
      
      setSelectedUser({
        ...user, // Use basic user data from online users if API fails
        ...defaultStats
      });
    } finally {
      setUserStatsLoading(false);
    }
  };

  const handleCloseUserModal = () => {
    setUserDetailsOpen(false);
    setSelectedUser(null);
  };

  const handleCleanupOnlineUsers = async () => {
    try {
      console.log('Starting online users cleanup...');
      const response = await api.post('/api/admin/online-users/cleanup');
      
      if (response.data.success) {
        console.log('Cleanup successful:', response.data);
        // Wait a bit before refreshing to avoid spam
        setTimeout(() => {
          if (requestOnlineUsers) {
            requestOnlineUsers();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error cleaning up online users:', error);
    }
  };

  const handleClearFrontendCache = () => {
    console.log('🧹 Clearing frontend online users cache...');
    // This will immediately clear the frontend state
    if (socket) {
      socket.emit('online-users-updated', []);
    }
    // Wait a bit before refreshing to avoid spam
    setTimeout(() => {
      if (requestOnlineUsers) {
        requestOnlineUsers();
      }
    }, 1000);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>טוען נתונים...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      direction: 'rtl', 
      backgroundColor: '#f5f7fa', 
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      '& @keyframes pulse': {
        '0%': { opacity: 1 },
        '50%': { opacity: 0.5 },
        '100%': { opacity: 1 }
      }
    }}>
      {/* Main Content Container - Centered */}
      <Box sx={{ 
        maxWidth: '1400px', 
        width: '100%',
        p: 3 
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#2c3e50' }}>
            {getGreeting()}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
            {getRoleDisplayName(user?.role)} • מערכת מעקב גניבות רכב אלגר
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            sx={{ mr: 2 }}
          >
            רענן נתונים
          </Button>
        </Box>

      {/* Statistics Cards */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center',
            height: '100%'
          }} className="dashboard-stats-card">
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                backgroundColor: '#f39c12', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }} className="dashboard-stats-icon">
                <EventIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }} className="dashboard-stats-number">
                {stats.pendingActionReports}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="dashboard-stats-label">
                דוחות פעולה ממתינים
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center',
            height: '100%'
          }} className="dashboard-stats-card">
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                backgroundColor: '#3498db', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }} className="dashboard-stats-icon">
                <AccessTimeIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }} className="dashboard-stats-number">
                {stats.activeCases}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="dashboard-stats-label">
                אירועים פעילים
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center',
            height: '100%'
          }} className="dashboard-stats-card">
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                backgroundColor: '#27ae60', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }} className="dashboard-stats-icon">
                <CheckCircleIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }} className="dashboard-stats-number">
                {stats.recoveredCars}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="dashboard-stats-label">
                אירועים סגורים
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center',
            height: '100%'
          }} className="dashboard-stats-card">
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                backgroundColor: '#9b59b6', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }} className="dashboard-stats-icon">
                <PeopleIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }} className="dashboard-stats-number">
                {onlineUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="dashboard-stats-label">
                מתנדבים מחוברים
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Area */}
      <Grid container spacing={4}>
        {/* My Active Assignments - Show for users with assignments */}
        {user && stats.userAssignments && stats.userAssignments.filter(a => 
          ['assigned', 'accepted'].includes(a.status) && 
          (!a.event?.event_status || !['הסתיים', 'בוטל'].includes(a.event.event_status))
        ).length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: '1px solid #e0e6ed',
              mb: 3,
              backgroundColor: '#fff8e1'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                    🎯 המשימות שלי
                  </Typography>
                  <Chip 
                    label={`${stats.userAssignments.filter(a => 
                      ['assigned', 'accepted'].includes(a.status) && 
                      (!a.event?.event_status || !['הסתיים', 'בוטל'].includes(a.event.event_status))
                    ).length} משימות פעילות`} 
                    sx={{ 
                      backgroundColor: '#ff9800',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
                
                {stats.userAssignments.filter(a => 
                  ['assigned', 'accepted'].includes(a.status) && 
                  (!a.event?.event_status || !['הסתיים', 'בוטל'].includes(a.event.event_status))
                ).map((assignment) => (
                  <Box key={assignment.id} sx={{ mb: 3 }}>
                    <Card sx={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e0e6ed',
                      borderRadius: 2 
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50', mb: 1 }}>
                              {assignment.event?.title || 'אירוע לא זמין'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOnIcon sx={{ fontSize: 16 }} />
                              {assignment.event?.full_address || 'מיקום לא זמין'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              הוקצה ב: {new Date(assignment.assigned_at).toLocaleString('he-IL')}
                            </Typography>
                          </Box>
                          <Chip 
                            label={assignment.status === 'assigned' ? 'הוקצה' : 'אושר'}
                            color={assignment.status === 'assigned' ? 'primary' : 'success'}
                            size="small"
                          />
                        </Box>
                        
                        {/* Tracking Buttons Component */}
                        <TrackingButtons 
                          assignment={assignment}
                          currentUser={user}
                          onStatusUpdate={loadDashboardData}
                        />
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Live Tracking Map - Show ONLY for command and control roles */}
        {user && ['מוקדן', 'מפקד משל"ט', 'פיקוד יחידה', 'אדמין', 'מפתח'].includes(user.role) && (
          <Grid item xs={12}>
            <LiveTrackingMap />
          </Grid>
        )}

        {/* Active Events - Full Width */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            mb: 3
          }}>
            <CardContent sx={{ p: 3 }} className="dashboard-active-events">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="active-events-title-row">
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  אירועים פעילים
                </Typography>
                <Chip 
                  label={`${activeTheftCases.length} אירועים`} 
                  sx={{ 
                    backgroundColor: '#3498db',
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </Box>
              
              {activeTheftCases.length === 0 ? (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 6, 
                  color: 'text.secondary'
                }}>
                  <CheckCircleIcon sx={{ fontSize: 48, mb: 2, color: '#28a745' }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    אין אירועים פעילים כרגע
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {/* Table Header */}
                  <Box sx={{ 
                    display: { xs: 'none', md: 'flex' }, // Hide on mobile, show on desktop
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 1, 
                    p: 2, 
                    mb: 2,
                    border: '1px solid #e0e6ed'
                  }} className="dashboard-active-events-header">
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      זמן אירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '20%', textAlign: 'center', fontWeight: 600 }}>
                      מיקום האירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      מס' רכב
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      סוג אירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '20%', textAlign: 'center', fontWeight: 600 }}>
                      פרטים נוספים
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      סטטוס
                    </Typography>
                  </Box>
                  
                  {/* Event Rows */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activeTheftCases.map((theftCase, index) => (
                      <Card 
                        key={theftCase.id} 
                        onClick={() => handleEventClick(theftCase)}
                        sx={{ 
                          borderRadius: 1,
                          border: '1px solid #e0e6ed',
                          cursor: 'pointer',
                          minHeight: '60px',
                          '&:hover': { 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            backgroundColor: '#f8f9fa',
                            transition: 'all 0.2s ease'
                          }
                        }}
                        className="dashboard-active-events-row"
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          {/* Desktop Layout */}
                          <Box sx={{ 
                            display: { xs: 'none', md: 'flex' }, // Hide on mobile, show on desktop
                            alignItems: 'center' 
                          }}>
                            <Box sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                תאריך: {new Date(theftCase.createdAt).toLocaleDateString('he-IL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                שעה: {new Date(theftCase.createdAt).toLocaleTimeString('he-IL', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ width: '20%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.location || 'מיקום לא זמין'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.licensePlate || 'רישוי לא זמין'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.title || 'כותרת לא זמינה'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '20%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.description || 'תיאור לא זמין'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem', color: '#3498db', fontWeight: 600 }}>
                              פעיל
                            </Typography>
                          </Box>

                          {/* Mobile Layout */}
                          <Box sx={{ display: { xs: 'block', md: 'none' } }} className="dashboard-event-mobile">
                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                זמן:
                              </Typography>
                              <Box className="dashboard-event-value dashboard-event-time">
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                  תאריך: {new Date(theftCase.createdAt).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                  שעה: {new Date(theftCase.createdAt).toLocaleTimeString('he-IL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                              </Box>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                כותרת:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.title || 'כותרת לא זמינה'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                מיקום:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.location || 'מיקום לא זמין'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                מס' רכב:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.licensePlate || 'רישוי לא זמין'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                פרטים:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.description || 'תיאור לא זמין'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                סטטוס:
                              </Typography>
                              <Typography component="div" className="dashboard-event-status">
                                פעיל
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Closed Events - Full Width */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            mb: 3
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  אירועים סגורים לאחרונה
                </Typography>
                <Chip 
                  label={`${closedTheftCases.length} אירועים`} 
                  sx={{ 
                    backgroundColor: '#95a5a6',
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </Box>
              
              {closedTheftCases.length === 0 ? (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 6, 
                  color: 'text.secondary'
                }}>
                  <CheckCircleIcon sx={{ fontSize: 48, mb: 2, color: '#95a5a6' }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    אין אירועים סגורים לאחרונה
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {/* Table Header */}
                  <Box sx={{ 
                    display: { xs: 'none', md: 'flex' }, // Hide on mobile, show on desktop
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 1, 
                    p: 2, 
                    mb: 2,
                    border: '1px solid #e0e6ed'
                  }} className="dashboard-closed-events-header">
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      זמן סגירה
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '20%', textAlign: 'center', fontWeight: 600 }}>
                      מיקום האירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      מס' רכב
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      סוג אירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '20%', textAlign: 'center', fontWeight: 600 }}>
                      פרטים נוספים
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      סטטוס
                    </Typography>
                  </Box>
                  
                  {/* Event Rows */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {closedTheftCases.map((theftCase, index) => (
                      <Card 
                        key={theftCase.id} 
                        onClick={() => handleEventClick(theftCase)}
                        sx={{ 
                          borderRadius: 1,
                          border: '1px solid #e0e6ed',
                          opacity: 0.7,
                          cursor: 'pointer',
                          minHeight: '60px',
                          '&:hover': { 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            backgroundColor: '#f8f9fa',
                            opacity: 1,
                            transition: 'all 0.2s ease'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          {/* Desktop Layout */}
                          <Box sx={{ 
                            display: { xs: 'none', md: 'flex' }, // Hide on mobile, show on desktop
                            alignItems: 'center' 
                          }}>
                            <Box sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                תאריך: {theftCase.closedAt ? 
                                  new Date(theftCase.closedAt).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  }) :
                                  new Date(theftCase.createdAt).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })
                                }
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                שעה: {theftCase.closedAt ? 
                                  new Date(theftCase.closedAt).toLocaleTimeString('he-IL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) :
                                  new Date(theftCase.createdAt).toLocaleTimeString('he-IL', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                }
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ width: '20%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.location || 'מיקום לא זמין'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.licensePlate || 'רישוי לא זמין'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.title || 'כותרת לא זמינה'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '20%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.description || 'תיאור לא זמין'}
                            </Typography>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem', color: '#95a5a6', fontWeight: 600 }}>
                              סגור
                            </Typography>
                          </Box>

                          {/* Mobile Layout */}
                          <Box sx={{ display: { xs: 'block', md: 'none' } }} className="dashboard-event-mobile">
                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                זמן סגירה:
                              </Typography>
                              <Box className="dashboard-event-value dashboard-event-time">
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                  תאריך: {theftCase.closedAt ? 
                                    new Date(theftCase.closedAt).toLocaleDateString('he-IL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    }) :
                                    new Date(theftCase.createdAt).toLocaleDateString('he-IL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })
                                  }
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                  שעה: {theftCase.closedAt ? 
                                    new Date(theftCase.closedAt).toLocaleTimeString('he-IL', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) :
                                    new Date(theftCase.createdAt).toLocaleTimeString('he-IL', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  }
                                </Typography>
                              </Box>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                כותרת:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.title || 'כותרת לא זמינה'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                מיקום:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.location || 'מיקום לא זמין'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                מס' רכב:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.licensePlate || 'רישוי לא זמין'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                פרטים:
                              </Typography>
                              <Typography component="div" className="dashboard-event-value">
                                {theftCase.description || 'תיאור לא זמין'}
                              </Typography>
                            </Box>

                            <Box className="dashboard-event-data">
                              <Typography component="span" className="dashboard-event-label">
                                סטטוס:
                              </Typography>
                              <Typography component="div" className="dashboard-event-status dashboard-event-status-closed">
                                סגור
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Online Users */}
        <Grid item xs={12}>
          <Grid container spacing={4} justifyContent="center">
            {/* Online Users */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '1px solid #e0e6ed'
              }}>
                <CardContent sx={{ p: 3 }} className="online-users-mobile">
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                      מתנדבים מחוברים
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <OnlineIcon sx={{ 
                        fontSize: 12, 
                        color: connected ? '#27ae60' : '#e74c3c',
                        animation: connected ? 'pulse 2s infinite' : 'none'
                      }} />
                      <Chip 
                        label={`${onlineUsers.length} מתנדבים`} 
                        size="small"
                        sx={{ 
                          backgroundColor: connected ? '#d4edda' : '#f8d7da',
                          color: connected ? '#155724' : '#721c24',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                      <IconButton 
                        size="small" 
                        onClick={requestOnlineUsers}
                        disabled={!connected}
                        title="רענן רשימת מתנדבים מחוברים"
                        sx={{ 
                          color: '#3498db',
                          '&:hover': { 
                            backgroundColor: '#ecf0f1',
                            color: '#2980b9'
                          }
                        }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                      {user?.role === 'מפתח' && (
                        <>
                          <IconButton 
                            size="small" 
                            onClick={handleCleanupOnlineUsers}
                            disabled={!connected}
                            title="נקה חיבורים לא תקינים (מפתח בלבד)"
                            sx={{ 
                              color: '#e74c3c',
                              ml: 1,
                              '&:hover': { 
                                backgroundColor: '#ffeaea',
                                color: '#c0392b'
                              }
                            }}
                          >
                            <CleanupIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={handleClearFrontendCache}
                            title="נקה זיכרון מקומי (מפתח בלבד)"
                            sx={{ 
                              color: '#9b59b6',
                              ml: 1,
                              '&:hover': { 
                                backgroundColor: '#f3e5f5',
                                color: '#8e24aa'
                              }
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                  
                  {!connected ? (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 4, 
                      color: 'text.secondary',
                      backgroundColor: '#f8d7da',
                      borderRadius: 2,
                      border: '2px dashed #dc3545'
                    }}>
                      <Typography variant="body2" sx={{ color: '#721c24' }}>
                        החיבור נותק - מתחבר מחדש...
                      </Typography>
                    </Box>
                  ) : onlineUsers.length === 0 ? (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 4, 
                      color: 'text.secondary',
                      backgroundColor: '#f8f9fa',
                      borderRadius: 2,
                      border: '2px dashed #dee2e6'
                    }}>
                      <Typography variant="body2">
                        אין מתנדבים מחוברים
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {/* Debug log for dashboard rendering */}
                      {console.log('🖥️ Dashboard rendering online users:', onlineUsers)}
                      
                      <List dense sx={{ p: 0 }}>
                        {/* Determine how many users to show */}
                        {(() => {
                          const usersToShow = showAllOnlineUsers ? onlineUsers : onlineUsers.slice(0, 8);
                          return usersToShow.map((onlineUser, index) => (
                            <React.Fragment key={onlineUser.id}>
                              <ListItem 
                                sx={{ 
                                  px: 0, 
                                  py: 1,
                                  cursor: 'pointer',
                                borderRadius: 2,
                                '&:hover': {
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.2s ease'
                                }
                              }}
                              onClick={() => handleUserClick(onlineUser)}
                              className="online-user-item-mobile"
                            >
                              <ListItemIcon>
                                <Box sx={{ position: 'relative' }}>
                                  <UserAvatar 
                                    user={onlineUser}
                                    size={40}
                                    roleColor="#3498db"
                                    clickable={false}
                                  />
                                  <Box sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: 12,
                                    height: 12,
                                    backgroundColor: '#27ae60',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    animation: 'pulse 2s infinite'
                                  }} />
                                </Box>
                              </ListItemIcon>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                                  {onlineUser.full_name || onlineUser.username || onlineUser.name || 'Unknown User'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <Chip
                                    label={onlineUser.role || 'User'} 
                                    size="small" 
                                    sx={{
                                      fontSize: '0.7rem',
                                      height: 20,
                                      backgroundColor: '#e8f4fd',
                                      color: '#3498db'
                                    }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    מחובר {onlineUser.connectedAt ? new Date(onlineUser.connectedAt).toLocaleTimeString('he-IL', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : 'עכשיו'}
                                  </Typography>
                                </Box>
                              </Box>
                            </ListItem>
                            {index < usersToShow.length - 1 && (
                              <Divider sx={{ my: 1 }} />
                            )}
                          </React.Fragment>
                        ));
                        })()}
                      </List>
                      
                      {/* Show More / Show Less Button */}
                      {onlineUsers.length > 8 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setShowAllOnlineUsers(!showAllOnlineUsers)}
                            sx={{
                              borderColor: '#3498db',
                              color: '#3498db',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              px: 3,
                              py: 1,
                              borderRadius: 2,
                              '&:hover': {
                                backgroundColor: '#e8f4fd',
                                borderColor: '#2980b9',
                                color: '#2980b9'
                              }
                            }}
                          >
                            {showAllOnlineUsers 
                              ? `הצג פחות (${Math.min(8, onlineUsers.length)})` 
                              : `הצג עוד (+${onlineUsers.length - 8})`
                            }
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Event Details Modal */}
      <Dialog 
        open={eventDetailsOpen} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            direction: 'rtl',
            borderRadius: 3,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e6ed',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CarIcon sx={{ color: '#3498db' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              פרטי אירוע גניבת רכב
            </Typography>
          </Box>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selectedEvent && (
            <Grid container spacing={3}>
              {/* Event Details Section - Full Width */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, border: '1px solid #e0e6ed' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                      פרטי האירוע
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              כותרת האירוע
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {selectedEvent.title}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              מיקום
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOnIcon sx={{ fontSize: 16, color: '#7f8c8d' }} />
                              <Typography variant="body1">
                                {selectedEvent.location}
                              </Typography>
                            </Box>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              מספר רישוי
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {selectedEvent.licensePlate || 'לא צוין'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              סטטוס
                            </Typography>
                            <Chip 
                              label={selectedEvent.status || (selectedEvent.closedAt ? 'סגור' : 'פעיל')} 
                              sx={{
                                backgroundColor: selectedEvent.closedAt ? '#95a5a6' : '#3498db',
                                color: 'white',
                                fontWeight: 500
                              }}
                            />
                          </Box>

                          {/* Show closure reason if event is closed */}
                          {(selectedEvent.closure_reason || selectedEvent.closed_at) && (
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                סיבת סגירה
                              </Typography>
                              <Typography variant="body1" sx={{ 
                                fontWeight: 600,
                                color: '#95a5a6',
                                backgroundColor: '#f8f9fa',
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid #e0e6ed'
                              }}>
                                {selectedEvent.closure_reason || 'לא צוינה סיבת סגירה'}
                              </Typography>
                            </Box>
                          )}

                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {selectedEvent.closedAt ? 'תאריך סגירה' : 'תאריך יצירה'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 16, color: '#7f8c8d' }} />
                              <Typography variant="body1">
                                {selectedEvent.closedAt ? 
                                  new Date(selectedEvent.closedAt).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) :
                                  new Date(selectedEvent.createdAt).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                }
                              </Typography>
                            </Box>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              נוצר על ידי
                            </Typography>
                            <Typography variant="body1">
                              {selectedEvent.creator}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {selectedEvent.description && (
                        <Grid item xs={12}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              תיאור האירוע
                            </Typography>
                            <Typography variant="body1" sx={{ 
                              backgroundColor: '#f8f9fa', 
                              p: 2, 
                              borderRadius: 1,
                              border: '1px solid #e0e6ed'
                            }}>
                              {selectedEvent.description}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Assigned Volunteers Section */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, border: '1px solid #e0e6ed' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                      👥 מתנדבים מוקצים
                    </Typography>
                    {selectedEvent.assignedVolunteers && selectedEvent.assignedVolunteers.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {selectedEvent.assignedVolunteers.map((assignment, index) => {
                          // Handle both direct volunteer objects and assignment objects with nested volunteer
                          const volunteer = assignment.volunteer || assignment;
                          return (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <UserAvatar 
                                user={volunteer} 
                                size={32} 
                                showFallback={true}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {typeof volunteer === 'string' ? volunteer : (volunteer.full_name || volunteer.name || volunteer.username || 'לא ידוע')}
                                </Typography>
                                {typeof volunteer === 'object' && (volunteer.phone_number || volunteer.phone) && (
                                  <Typography variant="caption" color="text.secondary">
                                    {volunteer.phone_number || volunteer.phone}
                                  </Typography>
                                )}
                              </Box>
                              {typeof volunteer === 'object' && (assignment.status || volunteer.status) && (
                                <Chip 
                                size="small" 
                                label={assignment.status || volunteer.status}
                                color={(assignment.status || volunteer.status) === 'זמין' ? 'success' : 
                                       (assignment.status || volunteer.status) === 'עסוק' ? 'warning' : 'default'}
                              />
                            )}
                          </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        לא הוקצו מתנדבים לאירוע זה
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          borderTop: '1px solid #e0e6ed',
          justifyContent: 'center'
        }}>
          <Button 
            onClick={handleCloseModal}
            variant="contained"
            sx={{ 
              backgroundColor: '#3498db',
              '&:hover': { backgroundColor: '#2980b9' },
              minWidth: 120
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Modal */}
      <Dialog
        open={userDetailsOpen}
        onClose={handleCloseUserModal}
        maxWidth="md"
        fullWidth
        sx={{ direction: 'rtl' }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
          פרטי מתנדב
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <UserAvatar 
                  user={selectedUser}
                  size={64}
                  roleColor="#3498db"
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedUser.full_name || selectedUser.username || selectedUser.name || 'Unknown User'}
                  </Typography>
                  <Chip 
                    label="מחובר"
                    color="success"
                    size="small"
                  />
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    id="user-full-name"
                    name="fullName"
                    label="שם מלא"
                    value={selectedUser.full_name || selectedUser.username || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="user-username"
                    name="username"
                    label="שם משתמש"
                    value={selectedUser.username || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="user-phone"
                    name="phoneNumber"
                    label="טלפון"
                    value={selectedUser.phone_number || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                {/* Hide ID number from unauthorized users */}
                {canViewIdNumbers() && (
                  <Grid item xs={6}>
                    <TextField
                      id="user-id-number"
                      name="idNumber"
                      label="תעודת זהות"
                      value={selectedUser.id_number || 'לא צוין'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  </Grid>
                )}
                <Grid item xs={6}>
                  <TextField
                    id="user-role"
                    name="role"
                    label="תפקיד"
                    value={selectedUser.role || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="user-position"
                    name="position"
                    label="מעמד"
                    value={selectedUser.position || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="user-car-details"
                    name="carDetails"
                    label="פרטי רכב"
                    value={selectedUser.has_car ? 
                      `${selectedUser.car_type || 'לא צוין'} • ${selectedUser.license_plate || 'לא צוין'} • ${selectedUser.car_color || 'לא צוין'}` :
                      `ל${selectedUser.full_name || selectedUser.username} אין רכב במערכת`
                    }
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    multiline={!selectedUser.has_car}
                    rows={!selectedUser.has_car ? 1 : 1}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="user-join-date"
                    name="joinDate"
                    label="תאריך הצטרפות"
                    value={selectedUser.created_at ? 
                      new Date(selectedUser.created_at).toLocaleDateString('he-IL') : 
                      'לא זמין'
                    }
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  מידע חיבור
                </Typography>
                <Card sx={{ backgroundColor: '#f8f9fa' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.connectedAt ? (
                        `${selectedUser.full_name || selectedUser.username} מחובר מתאריך: ${new Date(selectedUser.connectedAt).toLocaleDateString('he-IL', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: '2-digit'
                        })}, משעה: ${new Date(selectedUser.connectedAt).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}`
                      ) : (
                        `${selectedUser.full_name || selectedUser.username} מחובר כרגע למערכת`
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  סטטיסטיקות
                </Typography>
                {userStatsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <LinearProgress sx={{ width: '100%' }} />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Card sx={{ backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                            {selectedUser.totalEvents || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            סה"כ אירועים
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ backgroundColor: '#fff3e0', textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                            {selectedUser.activeEvents || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            אירועים פעילים
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ backgroundColor: '#e8f5e8', textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                            {selectedUser.completedEvents || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            אירועים שהושלמו
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </Box>

              {/* Recent Assignments Section */}
              {selectedUser.assignments && selectedUser.assignments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    הקצאות אחרונות
                  </Typography>
                  <Card sx={{ backgroundColor: '#f8f9fa' }}>
                    <CardContent>
                      <List dense>
                        {selectedUser.assignments.slice(0, 5).map((assignment, index) => (
                          <React.Fragment key={assignment.id}>
                            <ListItem sx={{ px: 0 }}>
                              <ListItemIcon>
                                <EventIcon sx={{ 
                                  color: assignment.status === 'completed' ? '#2e7d32' : 
                                         assignment.status === 'assigned' ? '#1976d2' : '#f57c00',
                                  fontSize: 20 
                                }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {assignment.event?.title || 'אירוע לא זמין'}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      {assignment.event?.full_address || 'מיקום לא זמין'}
                                    </Typography>
                                    <br />
                                    <Chip 
                                      label={assignment.status === 'assigned' ? 'הוקצה' :
                                             assignment.status === 'accepted' ? 'אושר' :
                                             assignment.status === 'completed' ? 'הושלם' :
                                             assignment.status === 'declined' ? 'נדחה' : assignment.status}
                                      size="small"
                                      sx={{
                                        fontSize: '0.7rem',
                                        height: 18,
                                        backgroundColor: assignment.status === 'completed' ? '#e8f5e8' :
                                                        assignment.status === 'assigned' ? '#e3f2fd' :
                                                        assignment.status === 'accepted' ? '#fff3e0' : '#ffebee',
                                        color: assignment.status === 'completed' ? '#2e7d32' :
                                               assignment.status === 'assigned' ? '#1976d2' :
                                               assignment.status === 'accepted' ? '#f57c00' : '#d32f2f'
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                      {' • '}{new Date(assignment.assigned_at).toLocaleDateString('he-IL')}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < selectedUser.assignments.slice(0, 5).length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                      {selectedUser.assignments.length > 5 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                          +{selectedUser.assignments.length - 5} הקצאות נוספות
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* Car Information Section */}
              {selectedUser.has_car !== undefined && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    פרטי רכב
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Card sx={{ backgroundColor: selectedUser.has_car ? '#e8f5e8' : '#f8f9fa' }}>
                        <CardContent>
                          {selectedUser.has_car ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 1 }}>
                                יש רכב
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                סוג: {selectedUser.car_type || 'לא צוין'} • 
                                לוחית: {selectedUser.license_plate || 'לא צוין'} • 
                                צבע: {selectedUser.car_color || 'לא צוין'}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              אין רכב
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 3 }}>
          <Button 
            onClick={handleCloseUserModal}
            variant="contained"
            sx={{ 
              backgroundColor: '#3498db',
              '&:hover': { backgroundColor: '#2980b9' },
              minWidth: 120
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default Dashboard;
