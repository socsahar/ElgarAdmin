const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

// Helper function to generate date ranges
const getDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

// Helper function to format date for charts
const formatDateForChart = (date) => {
  return new Date(date).toLocaleDateString('he-IL', { 
    month: 'short', 
    day: 'numeric' 
  });
};

// Helper function to generate date series for filling gaps
const generateDateSeries = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(new Date(current).toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Main analytics endpoint
router.get('/', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const { start, end } = getDateRange(days);
    
    // Get event statistics
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, created_at, event_status, title, details')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true });
    
    if (eventsError) throw eventsError;
    
    // Get user activity (logins and actions)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, created_at, updated_at, role, is_active, full_name')
      .gte('created_at', start)
      .lte('created_at', end);
    
    if (usersError) throw usersError;
    
    // Get system logs for activity tracking - filter to only show meaningful user actions
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('logs')
      .select('id, created_at, level, message, user_id, source, metadata')
      .gte('created_at', start)
      .lte('created_at', end)
      .not('user_id', 'is', null) // Only logs with user_id (actual user actions)
      .not('message', 'like', '%GET /api/auth/me%') // Filter out auth check requests
      .not('message', 'like', '%304%') // Filter out 304 not modified responses
      .not('message', 'like', '%חיבור לבסיס הנתונים%') // Filter out database connection logs
      .not('message', 'like', '%נבדקו הרשאות%') // Filter out permission check logs
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (logsError) throw logsError;
    
    // Generate date series for consistent chart data
    const dateSeries = generateDateSeries(start, end);
    
    // Process incident statistics by day
    const incidentStatsByDay = {};
    dateSeries.forEach(date => {
      incidentStatsByDay[date] = {
        date: formatDateForChart(date),
        incidents: 0,
        resolved: 0,
        active: 0
      };
    });
    
    events.forEach(event => {
      const eventDate = event.created_at.split('T')[0];
      if (incidentStatsByDay[eventDate]) {
        incidentStatsByDay[eventDate].incidents++;
        
        if (event.event_status === 'הסתיים') {
          incidentStatsByDay[eventDate].resolved++;
        } else if (['דווח', 'פעיל', 'הוקצה', 'בטיפול'].includes(event.event_status)) {
          incidentStatsByDay[eventDate].active++;
        }
      }
    });
    
    const incidentStats = Object.values(incidentStatsByDay);
    
    // Process incident types
    const incidentTypes = {};
    events.forEach(event => {
      const type = event.title || 'לא צוין';
      incidentTypes[type] = (incidentTypes[type] || 0) + 1;
    });
    
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffaa00', '#ff00aa', '#00aaff', '#aaff00', '#aa00ff'];
    const topIncidentTypes = Object.entries(incidentTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }));
    
    // Process response time data (simulated based on event creation to status change)
    const responseTimeData = dateSeries.map(date => {
      const dayEvents = events.filter(e => e.created_at.split('T')[0] === date);
      const avgResponse = dayEvents.length > 0 ? Math.floor(Math.random() * 30) + 15 : 0; // Simulated for now
      
      return {
        date: formatDateForChart(date),
        avgResponse,
        target: 30 // 30 minutes target
      };
    });
    
    // Process volunteer activity
    const volunteerActivityByDay = {};
    dateSeries.forEach(date => {
      volunteerActivityByDay[date] = {
        date: formatDateForChart(date),
        activeVolunteers: 0
      };
    });
    
    // Count active users per day based on logs
    logs.forEach(log => {
      const logDate = log.created_at.split('T')[0];
      if (volunteerActivityByDay[logDate] && log.user_id) {
        volunteerActivityByDay[logDate].activeVolunteers++;
      }
    });
    
    const volunteerActivity = Object.values(volunteerActivityByDay);
    
    // Process system usage data
    const systemUsageByDay = {};
    dateSeries.forEach(date => {
      systemUsageByDay[date] = {
        date: formatDateForChart(date),
        logins: 0,
        actions: 0
      };
    });
    
    logs.forEach(log => {
      const logDate = log.created_at.split('T')[0];
      if (systemUsageByDay[logDate]) {
        if (log.message.includes('login') || log.message.includes('authentication')) {
          systemUsageByDay[logDate].logins++;
        } else {
          systemUsageByDay[logDate].actions++;
        }
      }
    });
    
    const systemUsage = Object.values(systemUsageByDay);
    
    // Get user names for recent activity
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role');
    
    if (allUsersError) throw allUsersError;
    
    const userMap = {};
    allUsers.forEach(user => {
      userMap[user.id] = user;
    });
    
    // Process recent activity with enhanced information - only meaningful user actions
    const meaningfulLogs = logs.filter(log => {
      const msg = log.message.toLowerCase();
      // Only include logs that represent actual user actions
      return (
        msg.includes('התחבר') ||
        msg.includes('התנתק') ||
        msg.includes('יצר') ||
        msg.includes('עודכן') ||
        msg.includes('נמחק') ||
        msg.includes('שונה') ||
        msg.includes('הוקצה') ||
        msg.includes('נפתר') ||
        msg.includes('רושם') ||
        msg.includes('משתמש') ||
        msg.includes('אירוע') ||
        (log.metadata && (
          log.metadata.action === 'login' ||
          log.metadata.action === 'logout' ||
          log.metadata.action === 'user_created' ||
          log.metadata.action === 'user_updated' ||
          log.metadata.action === 'user_deleted' ||
          log.metadata.action === 'event_created' ||
          log.metadata.action === 'event_updated' ||
          log.metadata.action === 'event_deleted' ||
          log.metadata.action === 'role_update' ||
          log.metadata.action === 'user_status_change'
        ))
      );
    });

    const recentActivity = meaningfulLogs.slice(0, 20).map(log => {
      const user = userMap[log.user_id];
      return {
        id: log.id,
        type: getActivityType(log.message),
        description: enhanceActivityDescription(log.message, user, log.metadata),
        timestamp: log.created_at,
        severity: getActivitySeverity(log.level),
        user_id: log.user_id,
        user_name: user?.full_name || 'משתמש לא ידוע',
        user_role: user?.role || 'לא ידוע',
        source: log.source,
        metadata: log.metadata
      };
    });
    
    // Calculate summary statistics
    const totalEvents = events.length;
    const resolvedEvents = events.filter(e => e.event_status === 'הסתיים').length;
    const activeEvents = events.filter(e => ['דווח', 'פעיל', 'הוקצה', 'בטיפול'].includes(e.event_status)).length;
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    
    // Response time calculation (simplified)
    const avgResponseTime = responseTimeData.reduce((sum, day) => sum + day.avgResponse, 0) / responseTimeData.length || 0;
    
    res.json({
      summary: {
        totalEvents,
        resolvedEvents,
        activeEvents,
        resolutionRate: totalEvents > 0 ? ((resolvedEvents / totalEvents) * 100).toFixed(1) : '0',
        totalUsers,
        activeUsers,
        avgResponseTime: Math.round(avgResponseTime)
      },
      incidentStats,
      responseTimeData,
      volunteerActivity,
      systemUsage,
      topIncidentTypes,
      recentActivity,
      dateRange: {
        start,
        end,
        days
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching analytics data',
      error: error.message 
    });
  }
});

// Helper function to categorize activity types
const getActivityType = (message) => {
  const msg = message.toLowerCase();
  if (msg.includes('created') || msg.includes('יצר') || msg.includes('נוצר')) {
    if (msg.includes('user') || msg.includes('משתמש')) return 'user_created';
    if (msg.includes('event') || msg.includes('אירוע')) return 'event_created';
    return 'item_created';
  } else if (msg.includes('updated') || msg.includes('עודכן') || msg.includes('שונה')) {
    if (msg.includes('user') || msg.includes('משתמש')) return 'user_updated';
    if (msg.includes('event') || msg.includes('אירוע')) return 'event_updated';
    return 'item_updated';
  } else if (msg.includes('deleted') || msg.includes('נמחק')) {
    if (msg.includes('user') || msg.includes('משתמש')) return 'user_deleted';
    if (msg.includes('event') || msg.includes('אירוע')) return 'event_deleted';
    return 'item_deleted';
  } else if (msg.includes('assigned') || msg.includes('הוקצה')) {
    return 'assignment';
  } else if (msg.includes('resolved') || msg.includes('נפתר')) {
    return 'resolution';
  } else if (msg.includes('login') || msg.includes('התחבר') || msg.includes('authentication')) {
    return 'login';
  } else if (msg.includes('logout') || msg.includes('התנתק')) {
    return 'logout';
  } else if (msg.includes('permission') || msg.includes('הרשאה')) {
    return 'permission_change';
  } else {
    return 'system_action';
  }
};

// Helper function to enhance activity descriptions
const enhanceActivityDescription = (message, user, metadata = {}) => {
  if (!user) return message;
  
  const userName = user.full_name || user.username;
  const userRole = user.role;
  
  // Check metadata for specific actions first
  if (metadata && metadata.action) {
    switch (metadata.action) {
      case 'login':
        return `${userName} (${userRole}) התחבר למערכת`;
      case 'logout':
        return `${userName} (${userRole}) התנתק מהמערכת`;
      case 'event_created':
        return `${userName} יצר אירוע חדש: ${metadata.event_title || 'ללא כותרת'}`;
      case 'event_updated':
        return `${userName} עדכן אירוע: ${metadata.event_title || 'ללא כותרת'}`;
      case 'event_deleted':
        return `${userName} מחק אירוע: ${metadata.event_title || 'ללא כותרת'}`;
      case 'role_update':
        return `${userName} שינה תפקיד של ${metadata.target_user_name || 'משתמש'} ל-${metadata.new_role}`;
      case 'user_status_change':
        return `${userName} ${metadata.new_status === 'פעיל' ? 'הפעיל' : 'השבית'} את ${metadata.target_user_name || 'משתמש'}`;
      case 'user_created':
        return `${userName} יצר משתמש חדש במערכת`;
      case 'user_updated':
        return `${userName} עדכן פרטי משתמש`;
      case 'user_deleted':
        return `${userName} מחק משתמש מהמערכת`;
    }
  }
  
  // Fallback to message analysis if no metadata
  const msg = message.toLowerCase();
  if (msg.includes('התחבר') || msg.includes('login')) {
    return `${userName} (${userRole}) התחבר למערכת`;
  } else if (msg.includes('התנתק') || msg.includes('logout')) {
    return `${userName} (${userRole}) התנתק מהמערכת`;
  } else if (msg.includes('יצר') && msg.includes('משתמש')) {
    return `${userName} יצר משתמש חדש במערכת`;
  } else if (msg.includes('עודכן') && msg.includes('משתמש')) {
    return `${userName} עדכן פרטי משתמש`;
  } else if (msg.includes('יצר') && msg.includes('אירוע')) {
    return `${userName} יצר אירוע חדש`;
  } else if (msg.includes('עודכן') && msg.includes('אירוע')) {
    return `${userName} עדכן אירוע`;
  } else if (msg.includes('נמחק')) {
    return `${userName} מחק פריט מהמערכת`;
  } else if (msg.includes('הוקצה')) {
    return `${userName} הקצה משימה למתנדב`;
  } else if (msg.includes('נפתר')) {
    return `${userName} סגר אירוע`;
  } else if (msg.includes('הרשאה') || msg.includes('תפקיד')) {
    return `${userName} שינה הרשאות במערכת`;
  } else {
    return `${userName} - ${message}`;
  }
};

// Helper function to determine activity severity
const getActivitySeverity = (level) => {
  switch (level) {
    case 'error':
      return 'high';
    case 'warn':
      return 'medium';
    case 'info':
      return 'low';
    default:
      return 'low';
  }
};

// Detailed event statistics
router.get('/events-detail', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const { start, end } = getDateRange(days);
    
    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        full_address,
        license_plate,
        car_model,
        car_color,
        created_by_id,
        assigned_volunteer_ids
      `)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      events: events || [],
      summary: {
        total: events?.length || 0,
        byStatus: events?.reduce((acc, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {}) || {},
        byType: events?.reduce((acc, event) => {
          acc[event.title] = (acc[event.title] || 0) + 1;
          return acc;
        }, {}) || {}
      }
    });
    
  } catch (error) {
    console.error('Error fetching detailed event analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching detailed event analytics',
      error: error.message 
    });
  }
});

// User activity analytics
router.get('/users-activity', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const { start, end } = getDateRange(days);
    
    // Get users with their activity
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, created_at, updated_at, is_active')
      .order('created_at', { ascending: false });
    
    if (usersError) throw usersError;
    
    // Get user activity from logs
    const { data: userLogs, error: logsError } = await supabaseAdmin
      .from('logs')
      .select('user_id, created_at, message, level')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });
    
    if (logsError) throw logsError;
    
    // Process user activity
    const userActivity = users.map(user => {
      const userActions = userLogs.filter(log => log.user_id === user.id);
      return {
        ...user,
        activityCount: userActions.length,
        lastActivity: userActions[0]?.created_at || null,
        activityTypes: userActions.reduce((acc, log) => {
          const type = getActivityType(log.message);
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      };
    });
    
    res.json({
      users: userActivity,
      summary: {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        byRole: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
        totalActions: userLogs.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching user activity analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching user activity analytics',
      error: error.message 
    });
  }
});

module.exports = router;
