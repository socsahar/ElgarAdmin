import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import api from '../utils/api';

const TrackingAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    averageResponseTime: 0,
    totalMissions: 0,
    completedToday: 0,
    topPerformers: [],
    recentCompletions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get all completed assignments with tracking data
      const response = await api.get('/api/volunteer-assignments/analytics');
      
      if (response.data) {
        setAnalytics(response.data);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('שגיאה בטעינת נתוני אנליטיקה');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות`;
  };

  if (loading) {
    return (
      <Card sx={{ p: 3 }}>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
          <Typography sx={{ textAlign: 'center', mt: 2 }}>טוען נתוני אנליטיקה...</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Box sx={{ direction: 'rtl' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: '#2c3e50' }}>
        📊 אנליטיקת מעקב משימות
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ fontSize: 30, mr: 1 }} />
                <Typography variant="h6">זמן תגובה ממוצע</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {formatDuration(analytics.averageResponseTime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon sx={{ fontSize: 30, mr: 1 }} />
                <Typography variant="h6">משימות היום</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {analytics.completedToday}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ fontSize: 30, mr: 1 }} />
                <Typography variant="h6">סה"כ משימות</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {analytics.totalMissions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 30, mr: 1 }} />
                <Typography variant="h6">יעילות</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {analytics.totalMissions > 0 ? 
                  Math.round((analytics.completedToday / analytics.totalMissions) * 100) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Performers */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e0e6ed' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                🏆 מתנדבים מובילים
              </Typography>
              
              {analytics.topPerformers.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  אין נתונים זמינים
                </Typography>
              ) : (
                <List dense>
                  {analytics.topPerformers.map((performer, index) => (
                    <React.Fragment key={performer.id}>
                      <ListItem sx={{ px: 0 }}>
                        <Avatar sx={{ mr: 2, bgcolor: '#3498db' }}>
                          {index + 1}
                        </Avatar>
                        <ListItemText
                          primary={performer.name}
                          secondary={`${performer.completedMissions} משימות • זמן ממוצע: ${formatDuration(performer.avgTime)}`}
                        />
                        <Chip 
                          label={`${performer.completedMissions} משימות`}
                          color="primary"
                          size="small"
                        />
                      </ListItem>
                      {index < analytics.topPerformers.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Completions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e0e6ed' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
                ⚡ משימות שהושלמו לאחרונה
              </Typography>
              
              {analytics.recentCompletions.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  אין משימות שהושלמו לאחרונה
                </Typography>
              ) : (
                <List dense>
                  {analytics.recentCompletions.map((completion, index) => (
                    <React.Fragment key={completion.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {completion.volunteerName} • {completion.eventTitle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(completion.completedAt).toLocaleString('he-IL')}
                              </Typography>
                            </Box>
                          }
                          secondary={`זמן כולל: ${formatDuration(completion.totalTime)}`}
                        />
                        <Chip 
                          label="הושלם"
                          color="success"
                          size="small"
                        />
                      </ListItem>
                      {index < analytics.recentCompletions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TrackingAnalytics;
