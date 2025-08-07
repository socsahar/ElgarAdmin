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
  useMediaQuery,
  Collapse,
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
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { useThemeMode } from '../contexts/ThemeContext';
import { hasPermission } from '../utils/permissions';

// Responsive drawer widths
const drawerWidth = 280;
const mobileDrawerWidth = '85vw'; // 85% of viewport width on mobile

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

  // Mobile detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

  const handleMobileDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleDrawerItemClick = (path) => {
    navigate(path);
    // Close mobile drawer after navigation
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const isMenuOpen = Boolean(anchorEl);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile header with close button */}
      {isMobile && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            תפריט ניווט
          </Typography>
          <IconButton onClick={handleMobileDrawerToggle} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      
      {/* Logo and title - responsive */}
      <Toolbar sx={{ 
        flexDirection: 'column', 
        alignItems: 'center', 
        py: isMobile ? 1 : 2,
        minHeight: isMobile ? 'auto' : '64px'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1,
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: 'center'
        }}>
          <img 
            src="/img/logo.png" 
            alt="לוגו אלגר" 
            style={{ 
              height: isMobile ? '30px' : '40px', 
              width: 'auto',
              marginLeft: isMobile ? '0' : '8px',
              marginBottom: isMobile ? '8px' : '0'
            }}
          />
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            component="div" 
            sx={{ fontWeight: 'bold' }}
          >
            מערכת אלגר
          </Typography>
        </Box>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            textAlign: 'center',
            fontSize: isMobile ? '0.7rem' : '0.75rem'
          }}
        >
          מערכת ניהול חירום
        </Typography>
      </Toolbar>
      
      <Divider />
      
      {/* Navigation menu - responsive */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: isMobile ? 1 : 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleDrawerItemClick(item.path)}
                sx={{
                  borderRadius: isMobile ? 1 : 0,
                  mx: isMobile ? 0.5 : 0,
                  my: isMobile ? 0.25 : 0,
                  minHeight: isMobile ? 44 : 48,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    minWidth: isMobile ? 40 : 56,
                    color: location.pathname === item.path ? 'inherit' : 'text.secondary'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      
      {/* User info at bottom - responsive */}
      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <Box sx={{ 
          p: isMobile ? 1.5 : 2, 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: isMobile ? 'center' : 'right'
        }}>
          <UserAvatar 
            user={user} 
            size={isMobile ? 32 : 40}
            sx={{ 
              mb: isMobile ? 1 : 0,
              ml: isMobile ? 0 : 1 
            }}
          />
          <Box sx={{ 
            flex: 1, 
            ml: isMobile ? 0 : 1,
            overflow: 'hidden'
          }}>
            <Typography 
              variant={isMobile ? "caption" : "body2"} 
              sx={{ 
                fontWeight: 'bold',
                fontSize: isMobile ? '0.8rem' : '0.875rem',
                lineHeight: 1.2,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.full_name || user?.username}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', direction: 'rtl' }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="פתח תפריט"
              edge="start"
              onClick={handleMobileDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <img 
                src="/img/logo.png" 
                alt="לוגו אלגר" 
                style={{ 
                  height: '28px', 
                  width: 'auto',
                  marginLeft: '8px'
                }}
              />
              <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem' }}>
                מערכת אלגר
              </Typography>
            </Box>

            <IconButton color="inherit" onClick={toggleMode} sx={{ mr: 1 }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            <IconButton
              size="small"
              edge="end"
              aria-label="פרופיל משתמש"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <UserAvatar 
                user={user}
                size={28}
                roleColor="secondary"
                clickable={false}
              />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Desktop AppBar */}
      {!isMobile && (
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
                aria-label="פרופיל משתמש"
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
      )}

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { md: drawerWidth }, 
          flexShrink: { md: 0 } 
        }}
      >
        {/* Mobile drawer */}
        {isMobile && (
          <Drawer
            variant="temporary"
            anchor="left"
            open={mobileDrawerOpen}
            onClose={handleMobileDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: mobileDrawerWidth,
                direction: 'rtl'
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
        
        {/* Desktop drawer */}
        {!isMobile && (
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
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? 1 : 3,
          width: { 
            md: `calc(100% - ${drawerWidth}px)`,
            xs: '100%'
          },
          ml: { md: `${drawerWidth}px`, xs: 0 },
          direction: 'rtl',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Profile Menu */}
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
