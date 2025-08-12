import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Assignment as SummaryIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import api from '../utils/api';
import UserAvatar from '../components/UserAvatar';

const Summaries = () => {
  const theme = useTheme();
  const location = useLocation();
  
  // State management
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [dateRange, setDateRange] = useState('last30');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  // Date range presets
  const dateRangeOptions = [
    { value: 'last7', label: '7 ימים אחרונים' },
    { value: 'last30', label: '30 ימים אחרונים' },
    { value: 'thisMonth', label: 'החודש הנוכחי' },
    { value: 'lastMonth', label: 'החודש הקודם' },
    { value: 'custom', label: 'טווח מותאם אישית' },
  ];

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Load data when filters change
  useEffect(() => {
    if (selectedUser) {
      loadSummaryData();
    }
  }, [selectedUser, startDate, endDate]);

  // Handle pre-selected user from navigation state
  useEffect(() => {
    if (location.state?.selectedUserId && users.length > 0) {
      setSelectedUser(location.state.selectedUserId);
      // Clear the state so it doesn't interfere with future navigation
      window.history.replaceState({}, document.title);
    }
  }, [users, location.state]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/volunteers');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('שגיאה בטעינת רשימת המתנדבים');
    }
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    const now = new Date();
    
    switch (value) {
      case 'last7':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case 'last30':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'custom':
        // Keep current dates for custom range
        break;
      default:
        break;
    }
  };

  const loadSummaryData = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Get user's assigned events in date range
      const eventsResponse = await api.get('/api/volunteer-assignments/user-summary', {
        params: {
          userId: selectedUser,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        }
      });

      const userEvents = eventsResponse.data;
      setEvents(userEvents);

      // Calculate summary statistics
      const totalEvents = userEvents.length;
      const activeEvents = userEvents.filter(e => e.event_status === 'פעיל').length;
      const completedEvents = userEvents.filter(e => e.event_status === 'הסתיים').length;
      const uniqueLocations = new Set(userEvents.map(e => e.full_address)).size;
      
      // Calculate time statistics (mock for now - you can enhance this)
      const avgResponseTime = '15 דקות'; // This would need actual calculation
      const totalHours = userEvents.length * 2; // Assuming 2 hours per event on average

      setSummaryData({
        totalEvents,
        activeEvents,
        completedEvents,
        uniqueLocations,
        avgResponseTime,
        totalHours,
      });

    } catch (error) {
      console.error('Error loading summary data:', error);
      setError('שגיאה בטעינת נתוני הסיכום');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!events.length) return;
    
    const headers = ['תאריך', 'כותרת', 'מיקום', 'סטטוס', 'לוחית רישוי'];
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        format(new Date(event.created_at), 'dd/MM/yyyy'),
        event.title,
        event.full_address,
        event.event_status,
        event.license_plate || 'לא צוין'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `summary_${selectedUser}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'פעיל': return 'error';
      case 'הסתיים': return 'success';
      case 'מושהה': return 'warning';
      default: return 'default';
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={he}>
      <Box sx={{ p: 3, direction: 'rtl' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#2c3e50' }}>
            📊 סיכומים
          </Typography>
          <Typography variant="body1" color="text.secondary">
            צפייה בסיכום פעילות מתנדבים לפי תאריכים ופילטרים
          </Typography>
        </Box>

        {/* Filters Section */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              🔍 פילטרים
            </Typography>
            
            <Grid container spacing={3}>
              {/* User Selection */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="user-select-label">בחר מתנדב</InputLabel>
                  <Select
                    labelId="user-select-label"
                    id="user-select"
                    name="userSelect"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    label="בחר מתנדב"
                  >
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <UserAvatar user={user} size={32} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.full_name || user.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.role}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Date Range Preset */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="date-range-label">טווח תאריכים</InputLabel>
                  <Select
                    labelId="date-range-label"
                    id="date-range"
                    name="dateRange"
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    label="טווח תאריכים"
                  >
                    {dateRangeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <>
                  <Grid item xs={12} md={2.5}>
                    <DatePicker
                      label="מתאריך"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth 
                          id="start-date"
                          name="startDate"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={2.5}>
                    <DatePicker
                      label="עד תאריך"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth 
                          id="end-date"
                          name="endDate"
                        />
                      )}
                    />
                  </Grid>
                </>
              )}

              {/* Action Buttons */}
              <Grid item xs={12} md={dateRange === 'custom' ? 12 : 5}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadSummaryData}
                    disabled={!selectedUser || loading}
                  >
                    רענן
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ExportIcon />}
                    onClick={exportToCSV}
                    disabled={!events.length}
                  >
                    ייצא לאקסל
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Results Section */}
        {selectedUserData && summaryData && !loading && (
          <>
            {/* User Info Header */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <UserAvatar user={selectedUserData} size={80} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      {selectedUserData.full_name || selectedUserData.username}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                      {selectedUserData.role} • {selectedUserData.phone_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      סיכום פעילות מ-{format(startDate, 'dd/MM/yyyy')} עד {format(endDate, 'dd/MM/yyyy')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}>
                <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <SummaryIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryData.totalEvents}
                    </Typography>
                    <Typography variant="body2">
                      סה"כ אירועים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} md={3}>
                <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryData.activeEvents}
                    </Typography>
                    <Typography variant="body2">
                      אירועים פעילים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} md={3}>
                <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <LocationIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryData.uniqueLocations}
                    </Typography>
                    <Typography variant="body2">
                      מקומות שונים
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} md={3}>
                <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TimeIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryData.totalHours}
                    </Typography>
                    <Typography variant="body2">
                      שעות משוערות
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Events Table */}
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  📋 פירוט אירועים ({events.length})
                </Typography>

                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>תאריך</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>כותרת</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>מיקום</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>לוחית רישוי</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>סטטוס</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>זמן הקצאה</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>יציאה</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>הגעה למקום</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>סיום</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              לא נמצאו אירועים בטווח התאריכים הנבחר
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map((event, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {event.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 200 }}>
                                {event.full_address}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CarIcon fontSize="small" color="action" />
                                {event.license_plate || 'לא צוין'}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={event.event_status}
                                color={getStatusColor(event.event_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {event.assigned_at ? 
                                format(new Date(event.assigned_at), 'dd/MM/yyyy HH:mm') : 
                                'לא ידוע'
                              }
                            </TableCell>
                            <TableCell>
                              {event.departure_time ? (
                                <Typography variant="body2" color="primary">
                                  {format(new Date(event.departure_time), 'dd/MM HH:mm')}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  לא יצא
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {event.arrival_time ? (
                                <Typography variant="body2" color="warning.main">
                                  {format(new Date(event.arrival_time), 'dd/MM HH:mm')}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  לא הגיע
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {event.completion_time ? (
                                <Typography variant="body2" color="success.main">
                                  {format(new Date(event.completion_time), 'dd/MM HH:mm')}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  לא סיים
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!selectedUser && !loading && (
          <Card sx={{ borderRadius: 2, textAlign: 'center', py: 6 }}>
            <CardContent>
              <PersonIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                בחר מתנדב כדי להציג סיכום
              </Typography>
              <Typography variant="body2" color="text.secondary">
                השתמש בפילטר למעלה כדי לבחור מתנדב ולצפות בסיכום הפעילות שלו
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Summaries;
