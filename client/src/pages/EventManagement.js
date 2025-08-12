import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Avatar,
  Fab,
  List,
  ListItem,
  useTheme,
  useMediaQuery,
  Menu,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  DirectionsCar as CarIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  FiberManualRecord as OnlineIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import volunteerAssignmentAPI from '../utils/volunteerAssignmentAPI';
import UserAvatar from '../components/UserAvatar';
import { hasPermission } from '../utils/permissions';

const EventManagement = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Validation functions
  const validateVehicleField = (value) => {
    // Allow only Hebrew letters, English letters, numbers, spaces, and hyphens
    const allowedPattern = /^[א-ת\u0590-\u05FF\u200F\u200Ea-zA-Z0-9\s\-]*$/;
    return allowedPattern.test(value);
  };

  const validateLicensePlate = (value) => {
    // Allow only numbers and hyphens
    const licensePlatePattern = /^[0-9\-]*$/;
    return licensePlatePattern.test(value);
  };

  const validateUrl = (value) => {
    if (!value) return true; // Allow empty URL
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleVehicleFieldChange = (field, value) => {
    // Remove special characters except allowed ones
    const sanitizedValue = value.replace(/[^א-ת\u0590-\u05FF\u200F\u200Ea-zA-Z0-9\s\-]/g, '');
    setEventForm({ ...eventForm, [field]: sanitizedValue });
  };

  const handleLicensePlateChange = (value) => {
    // Remove everything except numbers and hyphens
    const sanitizedValue = value.replace(/[^0-9\-]/g, '');
    setEventForm({ ...eventForm, license_plate: sanitizedValue });
  };

  const handleUrlChange = (value) => {
    // Only update if it's a valid URL or empty
    if (value === '' || validateUrl(value)) {
      setEventForm({ ...eventForm, tracking_url: value });
    }
  };

  // Car colors dropdown options
  const carColors = [
    'לבן',
    'שחור', 
    'אפור',
    'כסף',
    'אדום',
    'צהוב',
    'כתום',
    'ירוק',
    'כחול',
    'סגול',
    'חום'
  ];
  
  // State management
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState([]);
  const [closureReason, setClosureReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Tracking overview state
  const [trackingOverview, setTrackingOverview] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  // Mobile menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuEvent, setMenuEvent] = useState(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [showFilters, setShowFilters] = useState(false);

  // Form state for new/edit car theft event
  const [eventForm, setEventForm] = useState({
    title: '',
    full_address: '',
    details: '',
    license_plate: '',
    car_model: '',
    car_color: '',
    car_year: '',
    owner_name: '',
    owner_phone: '',
    theft_type: 'זעזועים',
    car_status: 'זעזועים',
    priority: 'בינוני',
    estimated_value: '',
    police_report_number: '',
    needs_tracking_system: false,
    tracking_url: '',
  });

  // Car theft specific status options
  const eventStatuses = ['דווח', 'פעיל', 'הוקצה', 'בטיפול', 'הסתיים', 'בוטל', 'סגור'];
  const carStatuses = ['זעזועים', 'סטטי', 'בתנועה', 'פורקה מערכת'];
  const theftTypes = ['זעזועים', 'סטטי', 'בתנועה', 'פורקה מערכת'];
  const priorityLevels = ['קריטי', 'גבוה', 'בינוני', 'נמוך'];
  const eventTitles = [
    'חשד לגניבה ממתין לאישור בעלים',
    'גניבה (אין אישור בעלים)',
    'גניבה (יש אישור בעלים)',
    'סריקות'
  ];

  useEffect(() => {
    loadEvents();
    loadAvailableVolunteers();
    if (hasCommandAccess()) {
      loadTrackingOverview();
    }
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Fetch events from API
      const response = await api.get('/api/admin/events');
      const events = response.data || [];
      
      // For each event, fetch volunteer assignments using the proper API
      const eventsWithAssignments = await Promise.all(
        events.map(async (event) => {
          try {
            const assignments = await volunteerAssignmentAPI.getEventAssignments(event.id);
            
            // Extract volunteer info from assignments
            const assigned_volunteers = assignments.map(assignment => ({
              id: assignment.volunteer.id,
              name: assignment.volunteer.full_name || assignment.volunteer.username,
              full_name: assignment.volunteer.full_name,
              username: assignment.volunteer.username,
              phone: assignment.volunteer.phone_number || 'לא צוין',
              phone_number: assignment.volunteer.phone_number,
              status: assignment.volunteer.is_active ? 'זמין' : 'לא זמין',
              role: assignment.volunteer.role,
              photo_url: assignment.volunteer.photo_url,
              id_number: assignment.volunteer.id_number,
              assignment_id: assignment.id,
              assignment_status: assignment.status,
              assigned_at: assignment.assigned_at
            }));
            
            return { ...event, assigned_volunteers, volunteer_assignments: assignments };
          } catch (error) {
            console.error(`Error fetching assignments for event ${event.id}:`, error);
            return { ...event, assigned_volunteers: [], volunteer_assignments: [] };
          }
        })
      );
      
      setEvents(eventsWithAssignments);
    } catch (error) {
      console.error('Error loading events:', error);
      showSnackbar('שגיאה בטעינת האירועים', 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load tracking overview for command roles
  const loadTrackingOverview = async () => {
    setTrackingLoading(true);
    try {
      const response = await volunteerAssignmentAPI.getActiveTracking();
      console.log('Active tracking response:', response);
      
      // Filter to show only assignments for the current user, exclude completed tasks, and exclude closed events
      const userAssignments = (response || []).filter(tracking => {
        const isCurrentUser = tracking.volunteer_id === user?.id;
        const isNotCompleted = tracking.status !== 'task_completed' && !tracking.completion_time;
        const isEventOpen = tracking.event_status && !['הסתיים', 'בוטל'].includes(tracking.event_status);
        const shouldShow = isCurrentUser && isNotCompleted && isEventOpen;
        
        console.log(`Tracking ${tracking.volunteer_name}: volunteer_id=${tracking.volunteer_id}, current_user_id=${user?.id}, isCurrentUser=${isCurrentUser}, status=${tracking.status}, event_status=${tracking.event_status}, isEventOpen=${isEventOpen}, completion_time=${tracking.completion_time}, shouldShow=${shouldShow}`);
        return shouldShow;
      });
      
      console.log('Filtered user assignments:', userAssignments);
      setTrackingOverview(userAssignments);
    } catch (error) {
      console.error('Error loading tracking overview:', error);
      setTrackingOverview([]);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Check if user has command role access
  const hasCommandAccess = () => {
    const allowedRoles = ['מוקדן', 'מפקד משל"ט', 'אדמין', 'מפקד יחידה', 'מפתח'];
    return user && allowedRoles.includes(user.role);
  };

  const loadAvailableVolunteers = async () => {
    try {
      // Try to fetch real volunteers from API
      const response = await api.get('/api/volunteers');
      
      if (response.data && response.data.length > 0) {
        // Map the volunteer data to the expected format
        const volunteers = response.data.map(volunteer => ({
          id: volunteer.id,
          name: volunteer.full_name || volunteer.username,
          phone: volunteer.phone_number || 'לא צוין',
          status: volunteer.is_active ? 'זמין' : 'לא זמין',
          photo_url: volunteer.photo_url, // Add photo URL
          role: volunteer.role
        }));
        
        setAvailableVolunteers(volunteers);
      } else {
        // If no volunteers found in API, set empty array
        setAvailableVolunteers([]);
      }
    } catch (error) {
      console.error('Error loading volunteers:', error);
      // If API fails, set empty array
      setAvailableVolunteers([]);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setEventForm({
      title: 'חשד לגניבה ממתין לאישור בעלים',
      full_address: '',
      details: '',
      license_plate: '',
      car_model: '',
      car_color: '',
      car_year: '',
      owner_name: '',
      owner_phone: '',
      theft_type: 'זעזועים',
      car_status: 'זעזועים',
      priority: 'בינוני',
      estimated_value: '',
      police_report_number: '',
      needs_tracking_system: false,
      tracking_url: '',
    });
    setOpenDialog(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      full_address: event.full_address,
      details: event.details,
      license_plate: event.license_plate,
      car_model: event.car_model,
      car_color: event.car_color,
      car_status: event.car_status,
      needs_tracking_system: event.needs_tracking_system,
      tracking_url: event.tracking_url || '',
    });
    setOpenDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (selectedEvent) {
        // Update existing event via API
        const response = await api.put(`/api/admin/events/${selectedEvent.id}`, eventForm);
        
        // Update local state with API response
        const updatedEvents = events.map(event =>
          event.id === selectedEvent.id
            ? { ...event, ...response.data }
            : event
        );
        setEvents(updatedEvents);
        showSnackbar('האירוע עודכן בהצלחה', 'success');
      } else {
        // Create new event via API
        const response = await api.post('/api/admin/events', {
          ...eventForm,
          status: 'דווח',
          creator_id: user?.id,
          assigned_volunteers: []
        });
        
        // Add new event to local state
        setEvents([response.data, ...events]);
        showSnackbar('האירוע נוצר בהצלחה', 'success');
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving event:', error);
      showSnackbar('שגיאה בשמירת האירוע', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) {
      try {
        // Call API to delete from database
        await api.delete(`/api/admin/events/${eventId}`);
        
        // Remove from local state after successful API call
        setEvents(events.filter(event => event.id !== eventId));
        showSnackbar('האירוע נמחק בהצלחה', 'success');
      } catch (error) {
        console.error('Error deleting event:', error);
        showSnackbar('שגיאה במחיקת האירוע', 'error');
      }
    }
  };

  const handleCloseEvent = (event) => {
    setSelectedEvent(event);
    setClosureReason('');
    setOpenCloseDialog(true);
  };

  const handleSaveEventClosure = async () => {
    if (!closureReason.trim()) {
      showSnackbar('חובה להזין סיבת סגירה', 'error');
      return;
    }

    try {
      const response = await api.post(`/api/admin/events/${selectedEvent.id}/close`, {
        closure_reason: closureReason.trim()
      });

      // Update the event in local state
      setEvents(events.map(event => 
        event.id === selectedEvent.id 
          ? { ...event, ...response.data.event, event_status: 'הסתיים' }
          : event
      ));

      setOpenCloseDialog(false);
      setSelectedEvent(null);
      setClosureReason('');
      showSnackbar('האירוע נסגר בהצלחה', 'success');
    } catch (error) {
      console.error('Error closing event:', error);
      showSnackbar('שגיאה בסגירת האירוע', 'error');
    }
  };

  const handleAssignVolunteers = (event) => {
    setSelectedEvent(event);
    
    console.log('Event data:', event);
    console.log('Assigned volunteers:', event.assigned_volunteers);
    
    // Transform assigned volunteers to include assignment_id and match field names
    const transformedVolunteers = (event.assigned_volunteers || []).map(assignment => {
      console.log('Processing assignment:', assignment);
      
      // Handle different possible data structures
      const volunteer = assignment.volunteer || assignment;
      
      if (!volunteer || !volunteer.id) {
        console.warn('Invalid volunteer data:', assignment);
        return null;
      }
      
      return {
        id: volunteer.id,
        name: volunteer.full_name || volunteer.username || volunteer.name,
        phone: volunteer.phone_number || volunteer.phone || 'לא צוין',
        status: volunteer.is_active ? 'זמין' : 'לא זמין',
        photo_url: volunteer.photo_url, // Add photo URL
        role: volunteer.role,
        assignment_id: assignment.id, // Add assignment ID for removal
        // Keep original volunteer data for reference
        ...volunteer
      };
    }).filter(Boolean); // Remove any null entries
    
    console.log('Transformed volunteers:', transformedVolunteers);
    
    setSelectedVolunteers(transformedVolunteers);
    setOpenAssignDialog(true);
  };

  const handleViewEventDetails = (event) => {
    setSelectedEvent(event);
    setOpenDetailsDialog(true);
  };

  const handleVolunteerToggle = async (volunteer) => {
    const isSelected = selectedVolunteers.some(v => v.id === volunteer.id);
    
    if (isSelected) {
      // Find the assignment to remove
      const assignmentToRemove = selectedVolunteers.find(v => v.id === volunteer.id);
      
      if (assignmentToRemove && assignmentToRemove.assignment_id) {
        try {
          // Remove assignment from database
          await volunteerAssignmentAPI.removeAssignment(assignmentToRemove.assignment_id);
          
          // Update local state
          setSelectedVolunteers(prev => prev.filter(v => v.id !== volunteer.id));
          
          showSnackbar(`הוסר המתנדב ${volunteer.full_name} מהאירוע בהצלחה`, 'success');
          
          // Reload events to get updated assignments
          await loadEvents();
        } catch (error) {
          console.error('Error removing volunteer assignment:', error);
          const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהסרת המתנדב';
          showSnackbar(errorMessage, 'error');
        }
      } else {
        // If no assignment_id, just remove from local state (new assignment not yet saved)
        setSelectedVolunteers(prev => prev.filter(v => v.id !== volunteer.id));
      }
    } else {
      // Add volunteer to selection
      setSelectedVolunteers(prev => [...prev, volunteer]);
    }
  };

  const handleSaveVolunteerAssignment = async () => {
    try {
      if (!selectedEvent) return;
      
      console.log('Assigning volunteers:', selectedVolunteers);
      console.log('Selected event:', selectedEvent);
      
      // Use the proper volunteer assignment API
      const result = await volunteerAssignmentAPI.assignVolunteers(
        selectedEvent.id,
        selectedVolunteers.map(v => v.id),
        `Assigned by admin on ${new Date().toLocaleString('he-IL')}`
      );
      
      console.log('Assignment result:', result);
      
      if (result.success) {
        // Reload events to get updated assignments
        await loadEvents();
        
        setOpenAssignDialog(false);
        setSelectedVolunteers([]);
        showSnackbar(
          `הוקצו ${selectedVolunteers.length} מתנדבים לאירוע "${selectedEvent.title}" בהצלחה`, 
          'success'
        );
      } else {
        throw new Error(result.message || 'Failed to assign volunteers');
      }
    } catch (error) {
      console.error('Error assigning volunteers:', error);
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהקצאת מתנדבים';
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Helper functions for tracking overview
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'assigned': return 'הוקצה';
      case 'departure': return 'בדרך למקום';
      case 'arrived_at_scene': return 'במקום האירוע';
      case 'task_completed': return 'הושלם';
      default: return status;
    }
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

  const formatTrackingTime = (timestamp) => {
    if (!timestamp) return 'לא זמין';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    } catch (error) {
      return 'זמן לא תקין';
    }
  };

  // Combined refresh function
  const handleRefreshAll = () => {
    loadEvents();
    if (hasCommandAccess()) {
      loadTrackingOverview();
    }
  };

  // Mobile menu handlers
  const handleMobileMenuOpen = (event, eventData) => {
    setAnchorEl(event.currentTarget);
    setMenuEvent(eventData);
  };

  const handleMobileMenuClose = () => {
    setAnchorEl(null);
    setMenuEvent(null);
  };

  const handleMobileAction = (action) => {
    if (!menuEvent) return;
    
    switch (action) {
      case 'edit':
        handleEditEvent(menuEvent);
        break;
      case 'assign':
        handleAssignVolunteers(menuEvent);
        break;
      case 'close':
        handleCloseEvent(menuEvent);
        break;
      case 'delete':
        handleDeleteEvent(menuEvent.id);
        break;
      default:
        break;
    }
    handleMobileMenuClose();
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'דווח': 'info',
      'פעיל': 'warning',
      'הוקצה': 'primary',
      'בטיפול': 'secondary',
      'הסתיים': 'success',
      'בוטל': 'error',
      'סגור': 'error',
    };
    return statusColors[status] || 'default';
  };

  const getCarStatusColor = (status) => {
    const statusColors = {
      'סטטי': 'success',
      'בתנועה': 'warning',
      'זעזועים': 'error',
      'פורקה מערכת': 'info',
    };
    return statusColors[status] || 'default';
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.full_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.license_plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus;
    if (statusFilter === 'הכל') {
      matchesStatus = true;
    } else if (statusFilter === 'סגור') {
      matchesStatus = !!event.closure_reason; // Events with closure reason are closed
    } else {
      matchesStatus = event.event_status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ direction: 'rtl', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          מערכת מעקב גניבות רכב
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
            disabled={loading || trackingLoading}
          >
            רענן
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateEvent}
            sx={{ 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
          >
            אירוע חדש
          </Button>
        </Box>
      </Box>

      {/* Tracking Overview for Command Roles */}
      {hasCommandAccess() && !trackingLoading && trackingOverview && trackingOverview.length > 0 && (
        <Card sx={{ mb: 3, border: '2px solid #2196F3', borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                המשימות שלי ({trackingOverview.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={loadTrackingOverview}
                disabled={trackingLoading}
              >
                רענן מעקב
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              {trackingOverview.map((tracking, index) => (
                <Grid item xs={12} sm={6} md={4} key={tracking.assignment_id || index}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                      {/* User Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#2196F3', mr: 1, width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {tracking.volunteer_name || 'לא זמין'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tracking.volunteer_role || 'מתנדב'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Event Details */}
                      <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {tracking.event_title || 'אירוע'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon fontSize="small" />
                          {tracking.event_address || 'מיקום לא זמין'}
                        </Typography>
                      </Box>

                      {/* Status and Times */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Chip
                          label={getStatusDisplayText(tracking.status)}
                          color={getStatusChipColor(tracking.status)}
                          size="small"
                          sx={{ alignSelf: 'flex-start' }}
                        />
                        
                        {/* Timeline */}
                        <Box sx={{ pl: 1 }}>
                          {tracking.departure_time && (
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              🚗 יציאה: {formatTrackingTime(tracking.departure_time)}
                            </Typography>
                          )}
                          {tracking.arrival_time && (
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              📍 הגעה: {formatTrackingTime(tracking.arrival_time)}
                            </Typography>
                          )}
                          {tracking.completion_time && (
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              ✅ סיום: {formatTrackingTime(tracking.completion_time)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{events.length}</Typography>
              <Typography variant="body2">סה"כ אירועים</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {events.filter(e => ['דווח', 'פעיל', 'הוקצה', 'בטיפול'].includes(e.event_status)).length}
              </Typography>
              <Typography variant="body2">אירועים פעילים</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {events.filter(e => e.closure_reason).length}
              </Typography>
              <Typography variant="body2">אירועים סגורים</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {events.filter(e => e.needs_tracking_system).length}
              </Typography>
              <Typography variant="body2">מערכות איתור פעילות</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                id="event-search"
                name="eventSearch"
                fullWidth
                variant="outlined"
                placeholder="חיפוש לפי כותרת, מיקום או לוחית רישוי..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">סטטוס אירוע</InputLabel>
                <Select
                  labelId="status-filter-label"
                  id="status-filter"
                  name="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="סטטוס אירוע"
                >
                  <MenuItem value="הכל">הכל</MenuItem>
                  {eventStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                מסננים
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            רשימת אירועים ({filteredEvents.length})
          </Typography>
          
          {isMobile ? (
            // Mobile: Card Layout
            <Grid container spacing={2}>
              {filteredEvents.map((event, index) => (
                <Grid item xs={12} key={event.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 },
                      borderRight: `4px solid ${theme.palette[getStatusColor(event.event_status)].main}`
                    }}
                    onClick={() => handleViewEventDetails(event)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      {/* Header with title and actions */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {event.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            {event.closure_reason ? (
                              <Tooltip title={`סיבת סגירה: ${event.closure_reason}`}>
                                <Chip 
                                  label="סגור" 
                                  color="error"
                                  size="small"
                                />
                              </Tooltip>
                            ) : (
                              <Chip 
                                label={event.event_status} 
                                color={getStatusColor(event.event_status)}
                                size="small"
                              />
                            )}
                            <Chip 
                              label={event.car_status} 
                              color={getCarStatusColor(event.car_status)}
                              size="small"
                              variant="outlined"
                            />
                            {event.needs_tracking_system && (
                              <Chip 
                                size="small" 
                                label="מערכת איתור" 
                                color="info"
                              />
                            )}
                          </Box>
                        </Box>
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobileMenuOpen(e, event);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      {/* Vehicle Info */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          🚗 {event.license_plate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {event.car_model} - {event.car_color}
                        </Typography>
                      </Box>

                      {/* Location */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.full_address}
                        </Typography>
                      </Box>

                      {/* Creator and Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          👨‍💼 {event.creator?.full_name || event.creator?.username || 'לא ידוע'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          📅 {new Date(event.created_at).toLocaleDateString('he-IL')}
                        </Typography>
                      </Box>

                      {/* Volunteers */}
                      {(event.assigned_volunteers && event.assigned_volunteers.length > 0) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            מתנדבים:
                          </Typography>
                          {event.assigned_volunteers.slice(0, 3).map((assignment, index) => {
                            const volunteer = assignment.volunteer || assignment;
                            return (
                              <UserAvatar 
                                key={volunteer.id || index}
                                user={volunteer}
                                size={20}
                                roleColor="primary"
                                clickable={false}
                              />
                            );
                          })}
                          {event.assigned_volunteers.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              +{event.assigned_volunteers.length - 3}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Event Number */}
                      <Box sx={{ textAlign: 'right', mt: 1 }}>
                        <Chip 
                          label={`אירוע #${events.findIndex(e => e.id === event.id) + 1}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            // Desktop: Table Layout
            <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>כותרת</strong></TableCell>
                  {!isMobile && <TableCell><strong>מיקום</strong></TableCell>}
                  <TableCell><strong>פרטי רכב</strong></TableCell>
                  <TableCell><strong>סטטוס אירוע</strong></TableCell>
                  {!isMobile && <TableCell><strong>סטטוס רכב</strong></TableCell>}
                  {!isMobile && <TableCell><strong>מתנדבים</strong></TableCell>}
                  {!isMobile && <TableCell><strong>נוצר ע"י</strong></TableCell>}
                  {!isMobile && <TableCell><strong>תאריך יצירה</strong></TableCell>}
                  <TableCell><strong>פעולות</strong></TableCell>
                  {!isMobile && <TableCell><strong>מספר אירוע</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvents.map((event, index) => (
                  <TableRow 
                    key={event.id} 
                    hover 
                    onClick={() => handleViewEventDetails(event)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {event.title}
                        </Typography>
                        {event.needs_tracking_system && (
                          <Chip 
                            size="small" 
                            label="מערכת איתור" 
                            color="info"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                        {/* Show additional info on mobile */}
                        {isMobile && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              📍 {event.full_address}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              👨‍💼 {event.creator?.full_name || 'לא ידוע'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              📅 {new Date(event.created_at).toLocaleString('he-IL')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {event.full_address}
                          </Typography>
                        </Box>
                      </TableCell>
                    )}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {event.license_plate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.car_model} - {event.car_color}
                        </Typography>
                        {/* Show car status on mobile */}
                        {isMobile && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip 
                              label={event.car_status} 
                              color={getCarStatusColor(event.car_status)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {event.closure_reason ? (
                        <Tooltip title={`סיבת סגירה: ${event.closure_reason}`}>
                          <Chip 
                            label="סגור" 
                            color="error"
                            size="small"
                          />
                        </Tooltip>
                      ) : (
                        <Chip 
                          label={event.event_status} 
                          color={getStatusColor(event.event_status)}
                          size="small"
                        />
                      )}
                      {/* Show volunteers on mobile */}
                      {isMobile && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          {(event.assigned_volunteers || []).slice(0, 2).map((assignment, index) => {
                            const volunteer = assignment.volunteer || assignment;
                            return (
                              <UserAvatar 
                                key={volunteer.id || index}
                                user={volunteer}
                                size={20}
                                roleColor="primary"
                                clickable={false}
                              />
                            );
                          })}
                          {(event.assigned_volunteers || []).length > 2 && (
                            <Typography variant="caption">
                              +{(event.assigned_volunteers || []).length - 2}
                            </Typography>
                          )}
                          {(!event.assigned_volunteers || event.assigned_volunteers.length === 0) && (
                            <Typography variant="caption" color="text.secondary">
                              לא הוקצה
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Chip 
                          label={event.car_status} 
                          color={getCarStatusColor(event.car_status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {(event.assigned_volunteers || []).slice(0, 2).map((assignment, index) => {
                            const volunteer = assignment.volunteer || assignment;
                            return (
                              <UserAvatar 
                                key={volunteer.id || index}
                                user={volunteer}
                                size={24}
                                roleColor="primary"
                                clickable={false}
                              />
                            );
                          })}
                          {(event.assigned_volunteers || []).length > 2 && (
                            <Typography variant="caption">
                              +{(event.assigned_volunteers || []).length - 2}
                            </Typography>
                          )}
                          {(!event.assigned_volunteers || event.assigned_volunteers.length === 0) && (
                            <Typography variant="caption" color="text.secondary">
                              לא הוקצה
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2">
                          {event.creator?.full_name || event.creator?.username || 'לא ידוע'}
                        </Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(event.created_at).toLocaleString('he-IL')}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      {isMobile ? (
                        // Mobile: Show menu button
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobileMenuOpen(e, event);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      ) : (
                        // Desktop: Show all action buttons
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={event.closure_reason ? "אירוע סגור - לא ניתן לעריכה" : "עריכה"}>
                            <span>
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEvent(event);
                                }}
                                disabled={!!event.closure_reason}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={event.closure_reason ? "אירוע סגור - לא ניתן להקצות מתנדבים" : "הקצאת מתנדבים"}>
                            <span>
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignVolunteers(event);
                                }}
                                disabled={!!event.closure_reason}
                              >
                                <AssignIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {!event.closure_reason && event.event_status !== 'הסתיים' && (
                            <Tooltip title="סגירת אירוע">
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseEvent(event);
                                }}
                                color="warning"
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {hasPermission(user, 'access_events_delete') && (
                            <Tooltip title={event.closure_reason ? "אירוע סגור - לא ניתן למחיקה" : "מחיקה"}>
                              <span>
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEvent(event.id);
                                  }}
                                  color="error"
                                  disabled={!!event.closure_reason}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {events.findIndex(e => e.id === event.id) + 1}
                        </Typography>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Event Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { direction: 'rtl' }
        }}
      >
        <DialogTitle>
          {selectedEvent ? 'עריכת אירוע' : 'אירוע חדש'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="event-title-label">כותרת האירוע</InputLabel>
                <Select
                  labelId="event-title-label"
                  id="event-title"
                  name="eventTitle"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  label="כותרת האירוע"
                >
                  {eventTitles.map(title => (
                    <MenuItem key={title} value={title}>{title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="event-location"
                name="eventLocation"
                fullWidth
                label="מיקום האירוע (כתובת מלאה)"
                value={eventForm.full_address}
                onChange={(e) => setEventForm({ ...eventForm, full_address: e.target.value })}
                required
                placeholder="לדוגמה: רחוב הרצל 29, פתח תקווה"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="event-details"
                name="eventDetails"
                fullWidth
                multiline
                rows={3}
                label="פרטים"
                value={eventForm.details}
                onChange={(e) => setEventForm({ ...eventForm, details: e.target.value })}
                required
                helperText="שדה חובה - נא לפרט את נסיבות האירוע"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="event-license-plate"
                name="licensePlate"
                fullWidth
                label="לוחית רישוי"
                value={eventForm.license_plate}
                onChange={(e) => handleLicensePlateChange(e.target.value)}
                required
                helperText="רק מספרים ומקפים מותרים (לדוגמה: 123-45-678)"
                placeholder="123-45-678"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="event-car-model"
                name="carModel"
                fullWidth
                label="סוג רכב"
                value={eventForm.car_model}
                onChange={(e) => handleVehicleFieldChange('car_model', e.target.value)}
                required
                helperText="רק אותיות, מספרים, רווחים ומקפים מותרים"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <Select
                  labelId="car-color-label"
                  id="car-color"
                  name="carColor"
                  value={eventForm.car_color}
                  onChange={(e) => setEventForm({ ...eventForm, car_color: e.target.value })}
                  label="צבע רכב"
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>בחר צבע רכב</em>
                  </MenuItem>
                  {carColors.map((color) => (
                    <MenuItem key={color} value={color}>
                      {color}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="car-status-label">סטטוס רכב</InputLabel>
                <Select
                  labelId="car-status-label"
                  id="car-status"
                  name="carStatus"
                  value={eventForm.car_status}
                  onChange={(e) => setEventForm({ ...eventForm, car_status: e.target.value })}
                  label="סטטוס רכב"
                >
                  {carStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    id="needs-tracking-system"
                    name="needsTrackingSystem"
                    checked={eventForm.needs_tracking_system}
                    onChange={(e) => setEventForm({ 
                      ...eventForm, 
                      needs_tracking_system: e.target.checked,
                      tracking_url: e.target.checked ? eventForm.tracking_url : ''
                    })}
                  />
                }
                label="מערכת איתור נדרשת"
              />
            </Grid>
            {eventForm.needs_tracking_system && (
              <Grid item xs={12}>
                <TextField
                  id="tracking-url"
                  name="trackingUrl"
                  fullWidth
                  label="קישור למיקום חי של הרכב"
                  value={eventForm.tracking_url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://maps.google.com/live-track..."
                  error={eventForm.tracking_url && !validateUrl(eventForm.tracking_url)}
                  helperText={eventForm.tracking_url && !validateUrl(eventForm.tracking_url) 
                    ? "נא להזין כתובת URL תקינה (מתחילה ב-http:// או https://)" 
                    : "כתובת URL תקינה בלבד"}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            ביטול
          </Button>
          <Button 
            onClick={handleSaveEvent}
            variant="contained"
            disabled={
              !eventForm.title || 
              !eventForm.full_address || 
              !eventForm.details?.trim() || 
              !eventForm.license_plate ||
              !eventForm.car_model ||
              !eventForm.car_color ||
              !eventForm.car_status
            }
          >
            {selectedEvent ? 'עדכן' : 'צור אירוע'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Volunteers Dialog */}
      <Dialog
        open={openAssignDialog}
        onClose={() => setOpenAssignDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { direction: 'rtl' }
        }}
      >
        <DialogTitle>
          הקצאת מתנדבים לאירוע
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Event Info - Left Side */}
            <Grid item xs={6}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                פרטי האירוע
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedEvent?.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {selectedEvent?.full_address}
              </Typography>
              
              {selectedVolunteers.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    מתנדבים נבחרים ({selectedVolunteers.length})
                  </Typography>
                  {selectedVolunteers.map((volunteer) => (
                    <Chip
                      key={volunteer.id}
                      label={volunteer.name}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      onDelete={() => handleVolunteerToggle(volunteer)}
                    />
                  ))}
                </Box>
              )}
            </Grid>

            {/* Volunteers List - Right Side */}
            <Grid item xs={6}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                רשימת מתנדבים
              </Typography>
              {availableVolunteers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  אמת לציבור מיקמון לאישור ביצועים
                  <br />
                  <Typography variant="caption">
                    טוען רשימת מתנדבים...
                  </Typography>
                </Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {availableVolunteers.map((volunteer) => (
                    <ListItem key={volunteer.id} disablePadding>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            id={`volunteer-${volunteer.id}`}
                            name={`volunteer_${volunteer.id}`}
                            checked={selectedVolunteers.some(v => v.id === volunteer.id)}
                            onChange={() => handleVolunteerToggle(volunteer)}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UserAvatar 
                              user={volunteer} 
                              size={32} 
                              roleColor="primary"
                              clickable={false}
                            />
                            <Box>
                              <Typography variant="body2">{volunteer.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {volunteer.phone}
                              </Typography>
                            </Box>
                            <Chip 
                              size="small" 
                              label={volunteer.status}
                              color={volunteer.status === 'זמין' ? 'success' : 
                                     volunteer.status === 'עסוק' ? 'warning' : 'default'}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenAssignDialog(false);
            setSelectedVolunteers([]);
          }}>
            ביטול
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveVolunteerAssignment}
            disabled={availableVolunteers.length === 0}
          >
            הקצה מתנדבים ({selectedVolunteers.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog 
        open={openDetailsDialog} 
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{ direction: 'rtl' }}
      >
        <DialogTitle>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              מספר אירוע: {selectedEvent ? events.findIndex(e => e.id === selectedEvent.id) + 1 : 0}
            </Typography>
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
              פרטי האירוע
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Event Title */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {selectedEvent.title}
                    </Typography>
                    <Chip 
                      label={selectedEvent.event_status === 'active' ? 'פעיל' : 
                             selectedEvent.event_status === 'completed' ? 'הושלם' : 
                             selectedEvent.event_status === 'cancelled' ? 'בוטל' : selectedEvent.event_status}
                      color={selectedEvent.event_status === 'active' ? 'success' : 
                             selectedEvent.event_status === 'completed' ? 'info' : 
                             selectedEvent.event_status === 'cancelled' ? 'error' : 'default'}
                      size="medium"
                    />
                  </Box>
                </Grid>

                {/* Location Information */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                      📍 מיקום
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>כתובת:</strong> {selectedEvent.full_address || 'לא צוין'}
                    </Typography>
                    {selectedEvent.license_plate && (
                      <Typography variant="body1">
                        <strong>מספר רכב:</strong> {selectedEvent.license_plate}
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* Car Information */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                      🚗 פרטי רכב
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>דגם:</strong> {selectedEvent.car_model || 'לא צוין'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>צבע:</strong> {selectedEvent.car_color || 'לא צוין'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>סטטוס:</strong> {selectedEvent.car_status || 'לא צוין'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Event Details */}
                {selectedEvent.details && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                        📝 פרטים נוספים
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedEvent.details}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Assigned Volunteers */}
                <Grid item xs={12}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                      👥 מתנדבים מוקצים
                    </Typography>
                    {selectedEvent.assigned_volunteers && selectedEvent.assigned_volunteers.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {selectedEvent.assigned_volunteers.map((volunteer, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <UserAvatar 
                              user={volunteer} 
                              size={32} 
                              showFallback={true}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {typeof volunteer === 'string' ? volunteer : (volunteer.name || volunteer.full_name || 'לא ידוע')}
                              </Typography>
                              {typeof volunteer === 'object' && volunteer.phone && (
                                <Typography variant="caption" color="text.secondary">
                                  {volunteer.phone}
                                </Typography>
                              )}
                            </Box>
                            {typeof volunteer === 'object' && volunteer.status && (
                              <Chip 
                                size="small" 
                                label={volunteer.status}
                                color={volunteer.status === 'זמין' ? 'success' : 
                                       volunteer.status === 'עסוק' ? 'warning' : 'default'}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        לא הוקצו מתנדבים לאירוע זה
                      </Typography>
                    )}
                  </Box>
                </Grid>

              </Grid>
              
              {/* Closure Information */}
              {selectedEvent.closure_reason && (
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 2, bgcolor: 'error.light', alpha: 0.1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'error.main' }}>
                      🔒 סיבת סגירה
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {selectedEvent.closure_reason}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        נסגר: {selectedEvent.closed_at ? new Date(selectedEvent.closed_at).toLocaleString('he-IL') : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        סגור על ידי: {selectedEvent.closed_by?.full_name || selectedEvent.closed_by?.username || 'לא ידוע'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              
              {/* Bottom section with creation date and creator */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  נוצר: {new Date(selectedEvent.created_at).toLocaleString('he-IL')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  יוצר האירוע: {selectedEvent.creator?.full_name || selectedEvent.creator?.username || 'לא ידוע'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setOpenDetailsDialog(false)}
            variant="outlined"
            size="large"
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Event Dialog */}
      <Dialog 
        open={openCloseDialog} 
        onClose={() => setOpenCloseDialog(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          סגירת אירוע
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedEvent && `סגירת אירוע: ${selectedEvent.title}`}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {selectedEvent && selectedEvent.license_plate && `רכב: ${selectedEvent.license_plate}`}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="סיבת סגירה"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={closureReason}
            onChange={(e) => setClosureReason(e.target.value)}
            placeholder="הזן את סיבת סגירת האירוע..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenCloseDialog(false)}
            variant="outlined"
          >
            ביטול
          </Button>
          <Button 
            onClick={handleSaveEventClosure}
            variant="contained"
            color="warning"
            disabled={!closureReason.trim()}
          >
            סגור אירוע
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMobileMenuClose}
        PaperProps={{
          sx: { direction: 'rtl' }
        }}
      >
        {menuEvent && !menuEvent.closure_reason && (
          <MenuItem onClick={() => handleMobileAction('edit')}>
            <EditIcon sx={{ mr: 1 }} />
            עריכה
          </MenuItem>
        )}
        {menuEvent && !menuEvent.closure_reason && (
          <MenuItem onClick={() => handleMobileAction('assign')}>
            <AssignIcon sx={{ mr: 1 }} />
            הקצאת מתנדבים
          </MenuItem>
        )}
        {menuEvent && !menuEvent.closure_reason && menuEvent.event_status !== 'הסתיים' && (
          <MenuItem onClick={() => handleMobileAction('close')}>
            <CloseIcon sx={{ mr: 1 }} />
            סגירת אירוע
          </MenuItem>
        )}
        {menuEvent && hasPermission(user, 'access_events_delete') && !menuEvent.closure_reason && (
          <MenuItem onClick={() => handleMobileAction('delete')}>
            <DeleteIcon sx={{ mr: 1 }} />
            מחיקה
          </MenuItem>
        )}
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ direction: 'rtl' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventManagement;
