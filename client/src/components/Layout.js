import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Analytics as AnalyticsIcon,
  Report as ReportIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Summarize as SummarizeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { useThemeMode } from '../contexts/ThemeContext';
import { hasPermission } from '../utils/permissions';

const drawerWidth = 280;

const allMenuItems = [
  { text: 'לוח בקרה', icon: <DashboardIcon />, path: '/dashboard', permission: 'view_dashboard_events' },
  { text: 'משתמשים', icon: <PeopleIcon />, path: '/users', permission: 'view_users_info' },
  { text: 'אירועים', icon: <EventIcon />, path: '/events', permission: 'view_events_list' },
  { text: 'אנליטיקה', icon: <AnalyticsIcon />, path: '/analytics', permission: 'access_analytics' },
  { text: 'דוחות פעולה', icon: <ReportIcon />, path: '/action-reports', permission: 'manage_own_action_reports' },
  { text: 'סיכומים', icon: <SummarizeIcon />, path: '/summaries', permission: 'access_summaries' },
  { text: 'הגדרות', icon: <SettingsIcon />, path: '/settings', permission: 'can_modify_privileges' },
];

const Layout = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null);

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    // Special case for summaries - check both permissions or if user is management role
    if (item.path === '/summaries') {
      return hasPermission(user, 'access_summaries') || 
             hasPermission(user, 'view_own_summaries') ||
             ['מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט'].includes(user?.role);
    }
    return hasPermission(user, item.permission);
  });

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const isMenuOpen = Boolean(anchorEl);

  const drawer = (
    <Box>
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'center', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <img 
            src="/img/logo.png" 
            alt="לוגו אלגר" 
            style={{ 
              height: '40px', 
              width: 'auto',
              marginLeft: '8px'
            }}
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            מערכת אלגר
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          מערכת ניהול חירום
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '20',
                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? theme.palette.primary.main : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  color: location.pathname === item.path ? theme.palette.primary.main : 'inherit',
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', direction: 'rtl' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src="/img/logo.png" 
              alt="לוגו אלגר" 
              style={{ 
                height: '32px', 
                width: 'auto',
                marginLeft: '8px'
              }}
            />
            <Typography variant="h6" component="div">
              מערכת ניהול אלגר
            </Typography>
          </Box>

          <IconButton color="inherit" onClick={toggleMode} sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
              {user?.full_name || user?.username || 'משתמש'}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <UserAvatar 
                user={user}
                size={32}
                roleColor="secondary"
                clickable={false}
              />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="permanent"
          anchor="left"
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              direction: 'rtl',
              position: 'fixed',
              height: '100%',
              overflow: 'auto'
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          direction: 'rtl'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <Menu
        anchorEl={anchorEl}
        id="primary-search-account-menu"
        keepMounted
        open={isMenuOpen}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ direction: 'rtl' }}
      >
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
          <AccountCircleIcon sx={{ mr: 1 }} />
          פרופיל
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          יציאה
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
