import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DatePicker,
  TextField,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  Assessment as StatsIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [selectedUser, setSelectedUser] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [stats, setStats] = useState({
    overview: {
      totalEvents: 0,
      activeUsers: 0,
      averageResponseTime: 0,
      completionRate: 0
    },
    eventsByDay: [],
    eventsByType: [],
    userPerformance: [],
    responseTimesTrend: []
  });
  const [users, setUsers] = useState([]);

  const { user } = useAuth();

  useEffect(() => {
    fetchStatistics();
    fetchUsers();
  }, [dateRange, selectedUser, eventType]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const params = {
        range: dateRange,
        user: selectedUser !== 'all' ? selectedUser : undefined,
        eventType: eventType !== 'all' ? eventType : undefined
      };

      const response = await axios.get('/api/statistics', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('שגיאה בטעינת נתונים סטטיסטיים. אנא נסה שוב מאוחר יותר.');
      // Set empty data structure instead of fake data
      setStats({
        overview: {
          totalEvents: 0,
          activeUsers: 0,
          averageResponseTime: 0,
          completionRate: 0
        },
        eventsByDay: [],
        eventsByType: [],
        userPerformance: [],
        responseTimesTrend: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleRefresh = () => {
    fetchStatistics();
  };

  const handleExport = () => {
    // Export statistics to CSV or PDF
    console.log('Exporting statistics...');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>טוען נתונים סטטיסטיים...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StatsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            סטטיסטיקות מערכת
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            יצוא נתונים
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FilterIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>טווח זמן</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              label="טווח זמן"
            >
              <MenuItem value="week">שבוע אחרון</MenuItem>
              <MenuItem value="month">חודש אחרון</MenuItem>
              <MenuItem value="quarter">רבעון אחרון</MenuItem>
              <MenuItem value="year">שנה אחרונה</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>משתמש</InputLabel>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              label="משתמש"
            >
              <MenuItem value="all">כל המשתמשים</MenuItem>
              {users.map((usr) => (
                <MenuItem key={usr.id} value={usr.id}>
                  {usr.name || usr.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>סוג אירוע</InputLabel>
            <Select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              label="סוג אירוע"
            >
              <MenuItem value="all">כל הסוגים</MenuItem>
              <MenuItem value="vehicle">רכב חשוד</MenuItem>
              <MenuItem value="traffic">אירוע תנועה</MenuItem>
              <MenuItem value="emergency">חירום כללי</MenuItem>
              <MenuItem value="tracking">מעקב רכב</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EventIcon sx={{ fontSize: 30, mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    סה"כ אירועים
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {stats.overview.totalEvents}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ fontSize: 30, mr: 1, color: 'success.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    משתמשים פעילים
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.overview.activeUsers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ fontSize: 30, mr: 1, color: 'warning.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    זמן תגובה ממוצע
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.overview.averageResponseTime} דק'
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SpeedIcon sx={{ fontSize: 30, mr: 1, color: 'info.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    אחוז השלמה
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {stats.overview.completionRate}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Events by Day */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                אירועים לפי יום
              </Typography>
              {stats.eventsByDay.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>אין נתוני אירועים זמינים לתקופה הנבחרת</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.eventsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="events" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Events by Type */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                אירועים לפי סוג
              </Typography>
              {stats.eventsByType.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>אין נתונים זמינים</Typography>
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.eventsByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {stats.eventsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 2 }}>
                    {stats.eventsByType.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            backgroundColor: item.color,
                            mr: 1,
                            borderRadius: 1
                          }}
                        />
                        <Typography variant="body2">
                          {item.type}: {item.count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Response Times Trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                מגמת זמני תגובה
              </Typography>
              {stats.responseTimesTrend.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>אין נתוני זמני תגובה זמינים</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.responseTimesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="time" stroke="#ff6b6b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Performance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ביצועי משתמשים
              </Typography>
              {stats.userPerformance.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>אין נתוני ביצועים זמינים</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>שם</TableCell>
                        <TableCell align="center">אירועים</TableCell>
                        <TableCell align="center">השלמה</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.userPerformance.map((user, index) => (
                        <TableRow key={index}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell align="center">{user.events}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${user.completion}%`}
                              color={user.completion >= 90 ? 'success' : user.completion >= 75 ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Statistics;
