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
  SwipeableDrawer,
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
  Search as SearchIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import UserAvatar from './UserAvatar';
import { useThemeMode } from '../contexts/ThemeContext';

// Enhanced responsive drawer widths
const drawerWidth = 280;
const mobileDrawerWidth = Math.min(320, window.innerWidth * 0.9); // Dynamic width based on screen size

const allMenuItems = [
  { text: 'לוח בקרה', icon: <DashboardIcon />, path: '/dashboard', permission: 'view_dashboard_events' },
  { text: 'משתמשים', icon: <PeopleIcon />, path: '/users', permission: 'view_users_info' },
  { text: 'אירועים', icon: <EventIcon />, path: '/events', permission: 'view_events_list' },
  { text: 'שאילתא', icon: <SearchIcon />, path: '/vehicle-search', permission: ['vehicle_use_system', 'vehicle_search_access'] },
  { text: 'אנליטיקה', icon: <AnalyticsIcon />, path: '/analytics', permission: 'access_analytics' },
  { text: 'דוחות פעולה', icon: <ReportIcon />, path: '/action-reports', permission: 'manage_own_action_reports' },
  { text: 'סיכומים', icon: <SummarizeIcon />, path: '/summaries', permission: ['access_summaries', 'view_own_summaries'] },
  { text: 'הגדרות', icon: <SettingsIcon />, path: '/settings', permission: 'can_modify_privileges' },
];

const Layout = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { hasPermission, loading, permissions } = usePermissions();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced mobile detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isSmallMobile = useMediaQuery('(max-width: 400px)');

  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    // Don't show any menu items if permissions are still loading
    if (loading) {
      return false;
    }
    
    // Make sure user exists
    if (!user) {
      return false;
    }
    
    // Handle array of permissions (check if user has any of the permissions)
    if (Array.isArray(item.permission)) {
      return item.permission.some(permission => hasPermission(permission));
    }
    
    return hasPermission(item.permission);
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

  // Enhanced drawer content with better mobile UX
  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.paper'
    }}>
      {/* Mobile header with enhanced styling */}
      {isMobile && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            תפריט ניווט
          </Typography>
          <IconButton 
            onClick={handleMobileDrawerToggle} 
            size="small"
            sx={{ color: 'inherit' }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </Box>
      )}
      
      {/* Logo and title - enhanced responsive design */}
      <Toolbar sx={{ 
        flexDirection: 'column', 
        alignItems: 'center', 
        py: isMobile ? 2 : 3,
        minHeight: isMobile ? 'auto' : '64px',
        bgcolor: isMobile ? 'background.default' : 'transparent'
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
              height: isMobile ? (isSmallMobile ? '24px' : '32px') : '40px', 
              width: 'auto',
              marginLeft: isMobile ? '0' : '8px',
              marginBottom: isMobile ? '8px' : '0'
            }}
          />
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            component="div" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: isMobile ? (isSmallMobile ? '1rem' : '1.1rem') : '1.25rem'
            }}
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
      
      {/* Navigation menu - enhanced mobile-friendly styling */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: isMobile ? 0.5 : 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleDrawerItemClick(item.path)}
                sx={{
                  borderRadius: isMobile ? 2 : 0,
                  mx: isMobile ? 1 : 0,
                  my: isMobile ? 0.75 : 0,
                  minHeight: isMobile ? (isSmallMobile ? 56 : 60) : 48,
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
                    minWidth: isMobile ? 48 : 56,
                    color: location.pathname === item.path ? 'inherit' : 'text.secondary'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: isMobile ? (isSmallMobile ? '0.95rem' : '1rem') : '1rem',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      
      {/* Enhanced user info at bottom */}
      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <Box sx={{ 
          p: isMobile ? 2.5 : 2, 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: isMobile ? 'center' : 'right',
          bgcolor: 'action.hover',
          minHeight: isMobile ? 80 : 'auto'
        }}>
          <UserAvatar 
            user={user} 
            size={isMobile ? (isSmallMobile ? 36 : 40) : 40}
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
              variant={isMobile ? "body2" : "body2"} 
              sx={{ 
                fontWeight: 'bold',
                fontSize: isMobile ? (isSmallMobile ? '0.85rem' : '0.9rem') : '0.875rem',
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
                fontSize: isMobile ? '0.75rem' : '0.75rem',
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
      {/* Enhanced Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            height: 64,
          }}
        >
          <Toolbar sx={{ minHeight: '64px !important' }}>
            <IconButton
              color="inherit"
              aria-label="פתח תפריט"
              edge="start"
              onClick={handleMobileDrawerToggle}
              sx={{ 
                mr: 2,
                p: 1.5
              }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <img 
                src="/img/logo.png" 
                alt="לוגו אלגר" 
                style={{ 
                  height: isSmallMobile ? '24px' : '28px', 
                  width: 'auto',
                  marginLeft: '8px'
                }}
              />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontSize: isSmallMobile ? '1rem' : '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                מערכת אלגר
              </Typography>
            </Box>

            <IconButton 
              color="inherit" 
              onClick={toggleMode} 
              sx={{ mr: 1, p: 1.5 }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            <IconButton
              size="large"
              edge="end"
              aria-label="פרופיל משתמש"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{ p: 1 }}
            >
              <UserAvatar 
                user={user} 
                size={isSmallMobile ? 28 : 32}
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

      {/* Enhanced Navigation Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { md: drawerWidth }, 
          flexShrink: { md: 0 } 
        }}
      >
        {/* Enhanced Mobile drawer with SwipeableDrawer */}
        {isMobile && (
          <SwipeableDrawer
            variant="temporary"
            anchor="left"
            open={mobileDrawerOpen}
            onClose={handleMobileDrawerToggle}
            onOpen={handleMobileDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
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
          </SwipeableDrawer>
        )}
        
        {/* Desktop drawer - unchanged */}
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
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Enhanced Main content with better mobile spacing */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? (isSmallMobile ? 2 : 2.5) : 3,
          width: { 
            md: `calc(100% - ${drawerWidth}px)`,
            xs: '100%'
          },
          ml: { md: `${drawerWidth}px`, xs: 0 },
          direction: 'rtl',
          minHeight: '100vh',
          backgroundColor: 'background.default',
          pt: isMobile ? '88px !important' : '88px !important', // Account for mobile AppBar
          // Add more breathing room on mobile
          ...(isMobile && {
            '& > *': {
              marginBottom: 3,
            },
            '& .MuiCard-root': {
              marginBottom: 2,
              padding: 2,
            },
            '& .MuiButton-root': {
              marginBottom: 1,
              minHeight: 48,
            }
          })
        }}
      >
        <Outlet />
      </Box>

      {/* Profile Menu - enhanced for mobile */}
      <Menu
        anchorEl={anchorEl}
        id="primary-search-account-menu"
        keepMounted
        open={isMenuOpen}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ 
          direction: 'rtl',
          '& .MuiMenuItem-root': {
            minHeight: isMobile ? 48 : 'auto',
            fontSize: isMobile ? '1rem' : '0.875rem',
            px: isMobile ? 3 : 2,
            py: isMobile ? 1.5 : 1
          }
        }}
      >
        <MenuItem 
          onClick={() => { 
            handleProfileMenuClose(); 
            navigate('/profile'); 
          }}
          sx={{ gap: 2 }}
        >
          <AccountCircleIcon sx={{ mr: 1 }} />
          פרופיל
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ gap: 2 }}>
          <LogoutIcon sx={{ mr: 1 }} />
          יציאה
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
