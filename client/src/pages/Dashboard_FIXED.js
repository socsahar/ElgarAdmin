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
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  FiberManualRecord as OnlineIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Assignment as AssignmentTaskIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { styled } from '@mui/material/styles';

function Dashboard() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [stats, setStats] = useState({
    totalTheftReports: 0,
    activeCases: 0,
    recoveredCars: 0,
    pendingReports: 0,
  });
  const [activeTheftCases, setActiveTheftCases] = useState([]);
  const [closedTheftCases, setClosedTheftCases] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Event Details Modal State
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [assignedVolunteers, setAssignedVolunteers] = useState([]);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time online users tracking
    if (socket && connected) {
      // Request current online users
      socket.emit('get-online-users');
      
      // Listen for online users updates
      socket.on('online-users-updated', (users) => {
        setOnlineUsers(users);
      });
      
      // Clean up listeners
      return () => {
        socket.off('online-users-updated');
      };
    }
  }, [socket, connected]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls to fetch real data
      // For now, initialize with empty data until real API is connected
      setStats({
        totalTheftReports: 0,
        activeCases: 0,
        recoveredCars: 0,
        pendingReports: 0,
      });

      setActiveTheftCases([]);
      setClosedTheftCases([]);
      setOnlineUsers([]);
      setRecentActivities([]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.full_name || user?.username || 'משתמש';
    
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
    setAssignedVolunteers(event.assignedVolunteers || []);
    loadAvailableVolunteers();
    setEventDetailsOpen(true);
  };

  const loadAvailableVolunteers = async () => {
    // TODO: Replace with actual API call to get volunteers from database
    // For now, using online users as available volunteers
    const volunteers = onlineUsers.map(user => ({
      id: user.id,
      name: user.full_name || user.username,
      role: user.role,
      phone: user.phone_number || 'לא זמין',
      status: 'זמין'
    }));
    setAvailableVolunteers(volunteers);
  };

  const handleVolunteerToggle = (volunteer) => {
    const isAssigned = assignedVolunteers.some(v => v.id === volunteer.id);
    if (isAssigned) {
      setAssignedVolunteers(prev => prev.filter(v => v.id !== volunteer.id));
    } else {
      setAssignedVolunteers(prev => [...prev, volunteer]);
    }
  };

  const handleSaveAssignments = async () => {
    try {
      // TODO: Replace with actual API call to save volunteer assignments
      console.log('Saving volunteer assignments:', {
        eventId: selectedEvent.id,
        assignedVolunteers: assignedVolunteers
      });
      
      // Update the event in the local state
      const updateEventInList = (events) => {
        return events.map(event => 
          event.id === selectedEvent.id 
            ? { ...event, assignedVolunteers: assignedVolunteers }
            : event
        );
      };
      
      setActiveTheftCases(prev => updateEventInList(prev));
      setClosedTheftCases(prev => updateEventInList(prev));
      
      setEventDetailsOpen(false);
    } catch (error) {
      console.error('Error saving volunteer assignments:', error);
    }
  };

  const handleCloseModal = () => {
    setEventDetailsOpen(false);
    setSelectedEvent(null);
    setAssignedVolunteers([]);
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
      p: 3, 
      backgroundColor: '#f5f7fa', 
      minHeight: '100vh',
      '& @keyframes pulse': {
        '0%': { opacity: 1 },
        '50%': { opacity: 0.5 },
        '100%': { opacity: 1 }
      }
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center'
          }}>
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
              }}>
                <EventIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
                {stats.totalTheftReports}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                דיווחי גניבה סהכ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center'
          }}>
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
              }}>
                <AccessTimeIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
                {stats.activeCases}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                אירועים פעילים
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center'
          }}>
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
              }}>
                <CheckCircleIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
                {stats.recoveredCars}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                אירועים סגורים
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e0e6ed',
            textAlign: 'center'
          }}>
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
              }}>
                <PeopleIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
                {onlineUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                מתנדבים מחוברים
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Area */}
      <Grid container spacing={3}>
        {/* Active Events - Full Width */}
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
                    display: 'flex', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 1, 
                    p: 2, 
                    mb: 2,
                    border: '1px solid #e0e6ed'
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      זמן אירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '20%', textAlign: 'center', fontWeight: 600 }}>
                      סמירוג הירוקה
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      מסוים מלבן
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      סגן בכיר
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '20%', textAlign: 'center', fontWeight: 600 }}>
                      מיקום האירוע
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                      נתונים
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
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {new Date().toLocaleDateString('he-IL')}
                            </Typography>
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
                    display: 'flex', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 1, 
                    p: 2, 
                    mb: 2,
                    border: '1px solid #e0e6ed'
                  }}>
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
                      נתונים
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ width: '15%', textAlign: 'center', fontSize: '0.875rem' }}>
                              {theftCase.closedAt || new Date().toLocaleDateString('he-IL')}
                            </Typography>
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
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Online Users and Activities */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {/* Online Users */}
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '1px solid #e0e6ed'
              }}>
                <CardContent sx={{ p: 3 }}>
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
                    <List dense sx={{ p: 0 }}>
                      {onlineUsers.slice(0, 8).map((onlineUser, index) => (
                        <React.Fragment key={onlineUser.id}>
                          <ListItem sx={{ px: 0, py: 1 }}>
                            <ListItemIcon>
                              <Box sx={{ position: 'relative' }}>
                                <Avatar sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  fontSize: '0.9rem',
                                  backgroundColor: '#3498db'
                                }}>
                                  {(onlineUser.full_name || onlineUser.username || onlineUser.name || 'U').charAt(0).toUpperCase()}
                                </Avatar>
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
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                                  {onlineUser.full_name || onlineUser.username || onlineUser.name || 'Unknown User'}
                                </Typography>
                              }
                              secondary={
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
                              }
                            />
                          </ListItem>
                          {index < onlineUsers.slice(0, 8).length - 1 && (
                            <Divider sx={{ my: 1 }} />
                          )}
                        </React.Fragment>
                      ))}
                      {onlineUsers.length > 8 && (
                        <ListItem sx={{ px: 0, py: 1, justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            +{onlineUsers.length - 8} מתנדבים נוספים מחוברים
                          </Typography>
                        </ListItem>
                      )}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activities */}
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '1px solid #e0e6ed'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                    פעילות אחרונה
                  </Typography>
              
                  {recentActivities.length === 0 ? (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 4, 
                      color: 'text.secondary',
                      backgroundColor: '#f8f9fa',
                      borderRadius: 2,
                      border: '2px dashed #dee2e6'
                    }}>
                      <Typography variant="body2">
                        אין פעילות אחרונה
                      </Typography>
                    </Box>
                  ) : (
                    <List dense sx={{ p: 0 }}>
                      {recentActivities.map((activity, index) => (
                        <React.Fragment key={activity.id}>
                          <ListItem sx={{ px: 0, py: 1 }}>
                            <ListItemIcon>
                              <Box sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: activity.type === 'event' ? '#e8f4fd' :
                                               activity.type === 'report' ? '#d4edda' :
                                               activity.type === 'login' ? '#fff3cd' : '#f8d7da'
                              }}>
                                {activity.type === 'event' && <EventIcon sx={{ fontSize: 16, color: '#3498db' }} />}
                                {activity.type === 'report' && <AssignmentIcon sx={{ fontSize: 16, color: '#27ae60' }} />}
                                {activity.type === 'login' && <PeopleIcon sx={{ fontSize: 16, color: '#f39c12' }} />}
                                {activity.type === 'approval' && <CheckCircleIcon sx={{ fontSize: 16, color: '#27ae60' }} />}
                              </Box>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ color: '#2c3e50' }}>
                                  {activity.text}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {activity.time}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < recentActivities.length - 1 && (
                            <Divider sx={{ my: 1 }} />
                          )}
                        </React.Fragment>
                      ))}
                    </List>
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
              {/* Event Details Section */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2, border: '1px solid #e0e6ed', mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                      פרטי האירוע
                    </Typography>
                    
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
                          {selectedEvent.licensePlate}
                        </Typography>
                      </Box>

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

                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {selectedEvent.closedAt ? 'תאריך סגירה' : 'תאריך יצירה'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: '#7f8c8d' }} />
                          <Typography variant="body1">
                            {selectedEvent.closedAt || selectedEvent.createdAt}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Volunteer Assignment Section */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2, border: '1px solid #e0e6ed' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                      שיוך מתנדבים
                    </Typography>
                    
                    {selectedEvent?.closedAt ? (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4, 
                        backgroundColor: '#f8f9fa',
                        borderRadius: 2,
                        border: '2px dashed #dee2e6'
                      }}>
                        <CheckCircleIcon sx={{ fontSize: 48, mb: 2, color: '#95a5a6' }} />
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#7f8c8d' }}>
                          אירוע סגור
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          לא ניתן לשייך מתנדבים לאירועים סגורים
                        </Typography>
                        
                        {assignedVolunteers.length > 0 && (
                          <Box sx={{ mt: 3, p: 2, backgroundColor: '#e8f4fd', borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#2c3e50' }}>
                              מתנדבים שהיו משויכים ({assignedVolunteers.length}):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                              {assignedVolunteers.map((volunteer) => (
                                <Chip
                                  key={volunteer.id}
                                  label={volunteer.name}
                                  size="small"
                                  sx={{
                                    backgroundColor: '#95a5a6',
                                    color: 'white'
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          בחר מתנדבים לשיוך לאירוע זה:
                        </Typography>

                        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                          {availableVolunteers.length === 0 ? (
                            <Box sx={{ 
                              textAlign: 'center', 
                              py: 4, 
                              color: 'text.secondary',
                              backgroundColor: '#f8f9fa',
                              borderRadius: 2,
                              border: '2px dashed #dee2e6'
                            }}>
                              <PersonIcon sx={{ fontSize: 48, mb: 2, color: '#7f8c8d' }} />
                              <Typography variant="body2">
                                אין מתנדבים זמינים כרגע
                              </Typography>
                            </Box>
                          ) : (
                            <List dense>
                              {availableVolunteers.map((volunteer) => (
                                <ListItem key={volunteer.id} sx={{ px: 0, py: 1 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={assignedVolunteers.some(v => v.id === volunteer.id)}
                                        onChange={() => handleVolunteerToggle(volunteer)}
                                        sx={{ mr: 1 }}
                                      />
                                    }
                                    label={
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {volunteer.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {volunteer.role} • {volunteer.phone}
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </Box>

                        {assignedVolunteers.length > 0 && (
                          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#2c3e50' }}>
                              מתנדבים משויכים ({assignedVolunteers.length}):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {assignedVolunteers.map((volunteer) => (
                                <Chip
                                  key={volunteer.id}
                                  label={volunteer.name}
                                  size="small"
                                  sx={{
                                    backgroundColor: '#3498db',
                                    color: 'white'
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </>
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
          justifyContent: 'space-between'
        }}>
          <Button 
            onClick={handleCloseModal}
            variant="outlined"
            sx={{ borderColor: '#95a5a6', color: '#95a5a6' }}
          >
            סגור
          </Button>
          {!selectedEvent?.closedAt && (
            <Button 
              onClick={handleSaveAssignments}
              variant="contained"
              sx={{ 
                backgroundColor: '#3498db',
                '&:hover': { backgroundColor: '#2980b9' }
              }}
            >
              שמור שיוכים
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
