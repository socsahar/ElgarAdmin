import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Badge,
  Divider,
  Box,
  Chip,
  Alert,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
  MarkAsUnread as MarkAsUnreadIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'התראת חירום',
      message: 'זוהתה פעילות חשודה באזור',
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      read: false
    },
    {
      id: 2,
      type: 'info',
      title: 'עדכון מערכת',
      message: 'הוסיפו תכונות חדשות לניהול מתנדבים',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      read: true
    },
    {
      id: 3,
      type: 'success',
      title: 'דוח פעולה אושר',
      message: 'הדוח שלך מתאריך היום אושר בהצלחה',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false
    }
  ]);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emergencyAlerts: true,
    systemUpdates: false
  });
  const { connected } = useSocket();

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'success':
        return <SuccessIcon color="success" />;
      case 'info':
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `לפני ${days} ימים`;
    if (hours > 0) return `לפני ${hours} שעות`;
    if (minutes > 0) return `לפני ${minutes} דקות`;
    return 'עכשיו';
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <NotificationsIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          התראות
        </Typography>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </Box>

      {/* Connection Status */}
      <Alert 
        severity={connected ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
      >
        {connected ? 'מחובר לשרת - מקבל התראות בזמן אמת' : 'לא מחובר לשרת - התראות עלולות להתעכב'}
      </Alert>

      {/* Notification Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h6">הגדרות התראות</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.pushNotifications}
                onChange={() => handleSettingChange('pushNotifications')}
              />
            }
            label="התראות דחיפה"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.emergencyAlerts}
                onChange={() => handleSettingChange('emergencyAlerts')}
              />
            }
            label="התראות חירום"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.systemUpdates}
                onChange={() => handleSettingChange('systemUpdates')}
              />
            }
            label="עדכוני מערכת"
          />
        </Box>
      </Paper>

      {/* Actions */}
      {notifications.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            סמן הכל כנקרא
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={clearAll}
          >
            נקה הכל
          </Button>
        </Box>
      )}

      {/* Notifications List */}
      <Paper>
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              אין התראות חדשות
            </Typography>
            <Typography variant="body2" color="text.secondary">
              התראות יופיעו כאן כשתהיינה
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    cursor: 'pointer'
                  }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <ListItemIcon>
                    {getIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" component="span">
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Chip size="small" label="חדש" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getTimeAgo(notification.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default Notifications;
