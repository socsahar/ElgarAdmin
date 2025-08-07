import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    summary: {
      totalEvents: 0,
      resolvedEvents: 0,
      activeEvents: 0,
      avgResponseTime: 0,
      resolutionRate: 0
    },
    incidentStats: [],
    responseTimeData: [],
    volunteerActivity: [],
    systemUsage: [],
    topIncidentTypes: [],
    recentActivity: []
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/analytics?days=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (error.response?.status === 404) {
        setError('נתוני אנליטיקה לא זמינים. אנא וודא שיש נתונים במערכת.');
      } else {
        setError('שגיאה בטעינת נתוני אנליטיקה. אנא נסה שוב מאוחר יותר.');
      }
      // Set empty data structure instead of mock data
      setAnalytics({
        summary: {
          totalEvents: 0,
          resolvedEvents: 0,
          activeEvents: 0,
          avgResponseTime: 0,
          resolutionRate: 0
        },
        incidentStats: [],
        responseTimeData: [],
        volunteerActivity: [],
        systemUsage: [],
        topIncidentTypes: [],
        recentActivity: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivitySeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'event_created': return '🚨';
      case 'event_updated': return '✏️';
      case 'event_deleted': return '🗑️';
      case 'user_created': return '👤';
      case 'user_updated': return '📝';
      case 'user_deleted': return '❌';
      case 'assignment': return '👥';
      case 'resolution': return '✅';
      case 'login': return '🔐';
      case 'logout': return '🚪';
      case 'permission_change': return '🔑';
      case 'system_action': return '⚙️';
      default: return '📋';
    }
  };

  const getActivityTypeLabel = (type) => {
    switch (type) {
      case 'event_created': return 'יצירת אירוע';
      case 'event_updated': return 'עדכון אירוע';
      case 'event_deleted': return 'מחיקת אירוע';
      case 'user_created': return 'יצירת משתמש';
      case 'user_updated': return 'עדכון משתמש';
      case 'user_deleted': return 'מחיקת משתמש';
      case 'assignment': return 'הקצאה';
      case 'resolution': return 'סגירת אירוע';
      case 'login': return 'התחברות';
      case 'logout': return 'התנתקות';
      case 'permission_change': return 'שינוי הרשאות';
      case 'system_action': return 'פעולת מערכת';
      default: return 'פעולה כללית';
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>טוען נתונים אנליטיים...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 2, fontSize: 40 }} />
          דוחות ואנליטיקה
        </Typography>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>תקופת זמן</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="תקופת זמן"
          >
            <MenuItem value="7">7 ימים אחרונים</MenuItem>
            <MenuItem value="30">30 ימים אחרונים</MenuItem>
            <MenuItem value="90">90 ימים אחרונים</MenuItem>
            <MenuItem value="365">שנה אחרונה</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Error Alert */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Summary Statistics */}
        {analytics?.summary && Object.keys(analytics.summary || {}).length > 0 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        סה״כ אירועים
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.summary?.totalEvents || 0}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        אירועים פתורים
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.summary?.resolvedEvents || 0}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        {analytics?.summary?.resolutionRate || 0}% פתרון
                      </Typography>
                    </Box>
                    <AssessmentIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        אירועים פעילים
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.summary?.activeEvents || 0}
                      </Typography>
                    </Box>
                    <TimelineIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        זמן תגובה ממוצע
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.summary?.avgResponseTime || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        דקות
                      </Typography>
                    </Box>
                    <TimelineIcon sx={{ fontSize: 40, color: 'info.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Incident Statistics */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <TimelineIcon sx={{ mr: 1 }} />
                מגמות אירועים
              </Typography>
              {(analytics?.incidentStats || []).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>אין נתונים זמינים לתקופה הנבחרת</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.incidentStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="incidents" 
                      stroke="#ff4444" 
                      strokeWidth={2}
                      name="סה״כ אירועים"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#00aa00" 
                      strokeWidth={2}
                      name="אירועים שנפתרו"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="active" 
                      stroke="#ff8800" 
                      strokeWidth={2}
                      name="אירועים פעילים"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Incident Types */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                סוגי אירועים מובילים
              </Typography>
              {(analytics?.topIncidentTypes || []).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>אין נתונים זמינים</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics?.topIncidentTypes || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(analytics?.topIncidentTypes || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                זמני תגובה ממוצעים
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics?.responseTimeData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgResponse" fill="#ff8800" name="זמן תגובה ממוצע (דקות)" />
                  <Bar dataKey="target" fill="#00aa00" name="יעד (דקות)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Volunteer Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                פעילות מתנדבים
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics?.volunteerActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="activeVolunteers" 
                    stroke="#0088aa" 
                    strokeWidth={2}
                    name="מתנדבים פעילים"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* User Activity Log */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                יומן פעילות משתמשים
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>סוג פעולה</TableCell>
                      <TableCell>משתמש</TableCell>
                      <TableCell>תיאור הפעולה</TableCell>
                      <TableCell>זמן</TableCell>
                      <TableCell>מקור</TableCell>
                      <TableCell>חומרה</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.recentActivity && (analytics?.recentActivity || []).length > 0 ? (
                      (analytics?.recentActivity || []).map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ mr: 1, fontSize: '1.2em' }}>
                                {getActivityIcon(activity.type)}
                              </Typography>
                              <Typography variant="body2">
                                {getActivityTypeLabel(activity.type)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {activity.user_name || 'משתמש לא ידוע'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {activity.user_role || 'תפקיד לא ידוע'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {activity.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(activity.timestamp).toLocaleString('he-IL', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={activity.source === 'App' ? 'אפליקציה' : 'אתר'}
                              color={activity.source === 'App' ? 'primary' : 'secondary'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={activity.severity === 'high' ? 'גבוה' : 
                                     activity.severity === 'medium' ? 'בינוני' : 'נמוך'}
                              color={getActivitySeverityColor(activity.severity)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          אין פעילות משתמשים זמינה לתקופה הנבחרת
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
