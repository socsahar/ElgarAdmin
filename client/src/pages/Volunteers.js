import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Fab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Map as MapIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CheckCircle as AvailableIcon,
  Cancel as BusyIcon,
  OfflinePin as OfflineIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import UserAvatar from '../components/UserAvatar';

const Volunteers = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    availability_status: '',
    skills: '',
    search: ''
  });
  const [stats, setStats] = useState({
    availability: { available: 0, busy: 0, offline: 0 },
    top_skills: [],
    response_stats: { average_response_time: 0, total_assignments: 0 }
  });

  useEffect(() => {
    fetchVolunteers();
    fetchStats();
  }, [filters, page, rowsPerPage]);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await api.get(`/api/volunteers?${params}`);
      setVolunteers(response.data);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      enqueueSnackbar('שגיאה בטעינת המתנדבים', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/volunteers/stats/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching volunteer stats:', error);
    }
  };

  const handleViewDetails = async (volunteerId) => {
    try {
      const response = await api.get(`/api/volunteers/${volunteerId}`);
      setSelectedVolunteer(response.data);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching volunteer details:', error);
      enqueueSnackbar('שגיאה בטעינת פרטי המתנדב', { variant: 'error' });
    }
  };

  const handleUpdateAvailability = async (volunteerId, status) => {
    try {
      await api.put(`/api/volunteers/${volunteerId}/availability`, {
        availability_status: status
      });
      enqueueSnackbar('סטטוס הזמינות עודכן בהצלחה', { variant: 'success' });
      fetchVolunteers();
      fetchStats();
    } catch (error) {
      console.error('Error updating availability:', error);
      enqueueSnackbar('שגיאה בעדכון סטטוס הזמינות', { variant: 'error' });
    }
  };

  const getAvailabilityIcon = (status) => {
    switch (status) {
      case 'available':
        return <AvailableIcon sx={{ color: 'success.main' }} />;
      case 'busy':
        return <BusyIcon sx={{ color: 'warning.main' }} />;
      case 'offline':
        return <OfflineIcon sx={{ color: 'text.disabled' }} />;
      default:
        return <PersonIcon />;
    }
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'busy':
        return 'warning';
      case 'offline':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAvailabilityText = (status) => {
    switch (status) {
      case 'available':
        return 'זמין';
      case 'busy':
        return 'עסוק';
      case 'offline':
        return 'לא מחובר';
      default:
        return 'לא ידוע';
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'לא ידוע';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'כעת';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `לפני ${hours} שעות`;
    const days = Math.floor(hours / 24);
    return `לפני ${days} ימים`;
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="success.main">
                  {stats.availability.available}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  מתנדבים זמינים
                </Typography>
              </Box>
              <AvailableIcon sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="warning.main">
                  {stats.availability.busy}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  מתנדבים עסוקים
                </Typography>
              </Box>
              <BusyIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="text.disabled">
                  {stats.availability.offline}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  מתנדבים לא מחוברים
                </Typography>
              </Box>
              <OfflineIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="primary.main">
                  {stats.response_stats.average_response_time}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  זמן תגובה ממוצע (דקות)
                </Typography>
              </Box>
              <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ניהול מתנדבים
        </Typography>
        <Box display="flex" gap={2}>
          <Fab
            color="primary"
            aria-label="add"
            size="medium"
            onClick={() => {/* TODO: Add volunteer */}}
          >
            <AddIcon />
          </Fab>
        </Box>
      </Box>

      <StatsCards />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <FilterIcon />
          <Typography variant="h6">מסנני חיפוש</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>סטטוס זמינות</InputLabel>
              <Select
                value={filters.availability_status}
                label="סטטוס זמינות"
                onChange={(e) => setFilters({ ...filters, availability_status: e.target.value })}
              >
                <MenuItem value="">הכל</MenuItem>
                <MenuItem value="available">זמין</MenuItem>
                <MenuItem value="busy">עסוק</MenuItem>
                <MenuItem value="offline">לא מחובר</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="חיפוש כישורים"
              value={filters.skills}
              onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
              placeholder="רפואה, כיבוי, חילוץ..."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="חיפוש כללי"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="שם, מספר טלפון, כתובת..."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Volunteers Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>מתנדב</TableCell>
                <TableCell>סטטוס זמינות</TableCell>
                <TableCell>מיקום</TableCell>
                <TableCell>כישורים</TableCell>
                <TableCell>משימות פעילות</TableCell>
                <TableCell>נראה לאחרונה</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : volunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Alert severity="info">לא נמצאו מתנדבים</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                volunteers.map((volunteer) => (
                  <TableRow key={volunteer.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <UserAvatar 
                          user={volunteer.user}
                          size={40}
                          roleColor="primary"
                        />
                        <Box>
                          <Typography variant="subtitle2">
                            {volunteer.user?.full_name || 'לא ידוע'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {volunteer.user?.phone || 'אין טלפון'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getAvailabilityIcon(volunteer.availability_status)}
                        <Chip
                          label={getAvailabilityText(volunteer.availability_status)}
                          color={getAvailabilityColor(volunteer.availability_status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {volunteer.address || 'לא ידוע'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {volunteer.skills?.slice(0, 2).map((skillItem, index) => (
                          <Chip
                            key={index}
                            label={skillItem.skill.name}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {volunteer.skills?.length > 2 && (
                          <Chip
                            label={`+${volunteer.skills.length - 2}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {volunteer.active_assignments?.length || 0} משימות
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatLastSeen(volunteer.last_seen)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(volunteer.id)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={-1} // We don't have total count from API
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="שורות בעמוד:"
        />
      </Paper>

      {/* Volunteer Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          פרטי מתנדב: {selectedVolunteer?.user?.full_name}
        </DialogTitle>
        <DialogContent>
          {selectedVolunteer && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      מידע אישי
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon color="action" />
                        <Typography>{selectedVolunteer.user?.full_name}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIcon color="action" />
                        <Typography>{selectedVolunteer.user?.phone}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocationIcon color="action" />
                        <Typography>{selectedVolunteer.address || 'לא ידוע'}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getAvailabilityIcon(selectedVolunteer.availability_status)}
                        <Typography>
                          {getAvailabilityText(selectedVolunteer.availability_status)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      כישורים ומומחיות
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {selectedVolunteer.skills?.map((skillItem, index) => (
                        <Chip
                          key={index}
                          label={skillItem.skill.name}
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      משימות פעילות
                    </Typography>
                    {selectedVolunteer.assignments?.length > 0 ? (
                      <List>
                        {selectedVolunteer.assignments.map((assignment, index) => (
                          <React.Fragment key={assignment.id}>
                            <ListItem>
                              <ListItemText
                                primary={assignment.incident?.title}
                                secondary={`סטטוס: ${assignment.status} | מיקום: ${assignment.incident?.location}`}
                              />
                              <Chip
                                label={assignment.incident?.severity}
                                color={assignment.incident?.severity === 'high' ? 'error' : 'warning'}
                                size="small"
                              />
                            </ListItem>
                            {index < selectedVolunteer.assignments.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Typography color="text.secondary">
                        אין משימות פעילות
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      אנשי קשר לחירום
                    </Typography>
                    {selectedVolunteer.emergency_contacts?.length > 0 ? (
                      <List>
                        {selectedVolunteer.emergency_contacts.map((contact, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemAvatar>
                                <Avatar>
                                  <PersonIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={contact.name}
                                secondary={`${contact.relationship} | ${contact.phone}`}
                              />
                            </ListItem>
                            {index < selectedVolunteer.emergency_contacts.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Typography color="text.secondary">
                        לא הוגדרו אנשי קשר לחירום
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            סגירה
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Volunteers;
