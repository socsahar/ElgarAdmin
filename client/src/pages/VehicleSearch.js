import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Divider,
  Paper,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Switch,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Search as SearchIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
  Security as SecurityIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import UserAvatar from '../components/UserAvatar';
import api from '../utils/api';

const VehicleSearch = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Permission checks - simplified role-based system
  const canUseSystem = true; // All users can search vehicles
  const canManageSystem = user?.role && ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role);
  const canManagePermissions = false; // Removed permission management
  const canDelegatePermissions = false; // Removed permission management

  // If user not logged in, show access denied
  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', direction: 'rtl' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>אין הרשאת גישה</Typography>
          אין לך הרשאה לגשת למערכת השאילתא. פנה למפתח המערכת לקבלת הרשאות.
        </Alert>
      </Box>
    );
  }
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Admin management state
  const [allVehicles, setAllVehicles] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  
  // User permissions management state
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  
  // Admin panel tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Image enlargement state
  const [enlargedImage, setEnlargedImage] = useState({ open: false, src: '', title: '' });
  
  // Form state for add/edit
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleColor: '',
    ownerName: '',
    ownerAddress: '',
    ownerPhone: '',
    vehicleImage: null,
    ownerImage: null
  });
  const [vehicleImage, setVehicleImage] = useState(null);
  const [ownerImage, setOwnerImage] = useState(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState('');
  const [ownerImagePreview, setOwnerImagePreview] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load admin data on component mount if user has management access
  useEffect(() => {
    if (canManageSystem) {
      loadAllVehicles();
      if (showAdminPanel && activeTab === 1) {
        loadAllUsers();
      }
    }
  }, [canManageSystem, showAdminPanel, activeTab]);

  const loadAllVehicles = async () => {
    if (!canManageSystem) return;
    
    setAdminLoading(true);
    try {
      const response = await api.get('/api/vehicles');
      if (response.data.success) {
        setAllVehicles(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setAllVehicles([]);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setError('שגיאה בטעינת רשימת רכבים');
      setAllVehicles([]);
    } finally {
      setAdminLoading(false);
    }
  };

  // Load all users for permission management
  const loadAllUsers = async () => {
    if (!canManagePermissions && !canDelegatePermissions) return;
    
    setUsersLoading(true);
    try {
      const response = await api.get('/api/vehicles/permissions/users');
      if (response.data.success) {
        setAllUsers(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('שגיאה בטעינת רשימת משתמשים');
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Grant vehicle permission to user
  const grantVehiclePermission = async (userId, permission) => {
    setPermissionsLoading(true);
    try {
      const response = await api.post('/api/vehicles/permissions/grant', {
        userId,
        permission
      });
      if (response.data.success) {
        // Refresh users list to show updated permissions
        await loadAllUsers();
        setError(''); // Clear any previous errors
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      const errorMessage = error.response?.data?.message || 'שגיאה במתן הרשאה';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Revoke vehicle permission from user
  const revokeVehiclePermission = async (userId, permission) => {
    setPermissionsLoading(true);
    try {
      const response = await api.delete('/api/vehicles/permissions/revoke', {
        data: { userId, permission }
      });
      if (response.data.success) {
        // Refresh users list to show updated permissions
        await loadAllUsers();
        setError(''); // Clear any previous errors
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      const errorMessage = error.response?.data?.message || 'שגיאה בביטול הרשאה';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Handle permission changes
  const handlePermissionChange = async (permission, checked) => {
    if (!selectedUser) return;
    
    try {
      let result;
      if (checked) {
        result = await grantVehiclePermission(selectedUser.id, permission);
      } else {
        result = await revokeVehiclePermission(selectedUser.id, permission);
      }
      
      if (result.success) {
        // Update UI state to reflect the change immediately
        if (checked) {
          setUserPermissions(prev => [...prev, permission]);
        } else {
          setUserPermissions(prev => prev.filter(p => p !== permission));
        }
        
        // Show success message briefly
        const successMessage = result.message;
        setError(`✅ ${successMessage}`);
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error changing permission:', error);
    }
  };

  // Save permission changes (no longer needed - using immediate API calls)
  const savePermissionChanges = () => {
    // This function is no longer needed since we save changes immediately
    // in handlePermissionChange
  };

  // Load users when permissions tab is first accessed
  useEffect(() => {
    if (showAdminPanel && activeTab === 1 && (canManagePermissions || canDelegatePermissions) && allUsers.length === 0) {
      loadAllUsers();
    }
  }, [showAdminPanel, activeTab, canManagePermissions, canDelegatePermissions]);

  // Real-time search as user types
  useEffect(() => {
    const performRealTimeSearch = async () => {
      if (!searchTerm.trim() || searchTerm.trim().length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        setError('');
        return;
      }

      setLoading(true);
      setError('');
      setHasSearched(true);
      
      try {
        const response = await api.get(`/api/vehicles/search?query=${encodeURIComponent(searchTerm.trim())}`);
        
        if (response.data.success) {
          setSearchResults(Array.isArray(response.data.data) ? response.data.data : []);
        } else {
          setError(response.data.message || 'שגיאה בחיפוש');
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Real-time search error:', error);
        setError(error.response?.data?.message || 'שגיאה בחיפוש רכבים');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search to avoid too many API calls
    const debounceTimer = setTimeout(() => {
      performRealTimeSearch();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('נדרש להזין מונח חיפוש');
      return;
    }

    // Clear any existing debounce and search immediately
    setLoading(true);
    setError('');
    setHasSearched(true);
    
    try {
      const response = await api.get(`/api/vehicles/search?query=${encodeURIComponent(searchTerm.trim())}`);
      
      if (response.data.success) {
        setSearchResults(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setError(response.data.message || 'שגיאה בחיפוש');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(error.response?.data?.message || 'שגיאה בחיפוש רכבים');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setError('');
    setHasSearched(false);
  };

  const openVehicleDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({
        licensePlate: vehicle.license_plate || '',
        vehicleType: vehicle.vehicle_type || '',
        vehicleModel: vehicle.vehicle_model || '',
        vehicleColor: vehicle.vehicle_color || '',
        ownerName: vehicle.owner_name || '',
        ownerAddress: vehicle.owner_address || '',
        ownerPhone: vehicle.owner_phone || '',
        vehicleImage: null,
        ownerImage: null
      });
      setVehicleImage(null);
      setOwnerImage(null);
      setVehicleImagePreview(vehicle.vehicle_image_url || '');
      setOwnerImagePreview(vehicle.owner_image_url || '');
    } else {
      setEditingVehicle(null);
      setVehicleForm({
        licensePlate: '',
        vehicleType: '',
        vehicleModel: '',
        vehicleColor: '',
        ownerName: '',
        ownerAddress: '',
        ownerPhone: '',
        vehicleImage: null,
        ownerImage: null
      });
      setVehicleImage(null);
      setOwnerImage(null);
      setVehicleImagePreview('');
      setOwnerImagePreview('');
    }
    setShowVehicleDialog(true);
  };

  const closeVehicleDialog = () => {
    setShowVehicleDialog(false);
    setEditingVehicle(null);
    setVehicleForm({
      licensePlate: '',
      vehicleType: '',
      vehicleModel: '',
      vehicleColor: '',
      ownerName: '',
      ownerAddress: '',
      ownerPhone: '',
      vehicleImage: null,
      ownerImage: null
    });
    setVehicleImage(null);
    setOwnerImage(null);
    setVehicleImagePreview('');
    setOwnerImagePreview('');
  };

  const handleFormChange = (field, value) => {
    setVehicleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (field, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (field === 'vehicleImage') {
          setVehicleImagePreview(e.target.result);
        } else {
          setOwnerImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
      
      // Update both the form state and separate image state
      setVehicleForm(prev => ({
        ...prev,
        [field]: file
      }));
      
      if (field === 'vehicleImage') {
        setVehicleImage(file);
      } else {
        setOwnerImage(file);
      }
    }
  };

  const submitVehicleForm = async () => {
    setFormLoading(true);
    
    try {
      // Upload images first if they exist
      let vehicleImageUrl = null;
      let ownerImageUrl = null;
      
      if (vehicleImage) {
        const vehicleFormData = new FormData();
        vehicleFormData.append('profilePhoto', vehicleImage);
        
        const vehicleImageResponse = await fetch('/api/upload/profile-photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: vehicleFormData
        });
        
        if (vehicleImageResponse.ok) {
          const vehicleImageData = await vehicleImageResponse.json();
          vehicleImageUrl = vehicleImageData.data.url;
        } else {
          throw new Error('שגיאה בהעלאת תמונת הרכב');
        }
      }
      
      if (ownerImage) {
        const ownerFormData = new FormData();
        ownerFormData.append('profilePhoto', ownerImage);
        
        const ownerImageResponse = await fetch('/api/upload/profile-photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: ownerFormData
        });
        
        if (ownerImageResponse.ok) {
          const ownerImageData = await ownerImageResponse.json();
          ownerImageUrl = ownerImageData.data.url;
        } else {
          throw new Error('שגיאה בהעלאת תמונת הבעלים');
        }
      }
      
      // Convert camelCase to snake_case for backend compatibility
      const vehicleData = {
        license_plate: vehicleForm.licensePlate,
        vehicle_type: vehicleForm.vehicleType,
        vehicle_model: vehicleForm.vehicleModel,
        vehicle_color: vehicleForm.vehicleColor,
        owner_name: vehicleForm.ownerName,
        owner_address: vehicleForm.ownerAddress,
        owner_phone: vehicleForm.ownerPhone,
        vehicle_image_url: vehicleImageUrl, // Set uploaded image URL
        owner_image_url: ownerImageUrl      // Set uploaded image URL
      };

      let response;
      if (editingVehicle) {
        response = await api.put(`/api/vehicles/${editingVehicle.id}`, vehicleData);
      } else {
        response = await api.post('/api/vehicles', vehicleData);
      }

      if (response.data.success) {
        closeVehicleDialog();
        loadAllVehicles(); // Refresh the list
        setError(''); // Clear any previous errors
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setError(error.response?.data?.message || error.message || 'שגיאה בשמירת רכב');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק רכב זה?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/vehicles/${vehicleId}`);
      if (response.data.success) {
        loadAllVehicles(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError(error.response?.data?.message || 'שגיאה במחיקת רכב');
    }
  };

  // Image enlargement functions
  const handleImageClick = (imageSrc, imageTitle) => {
    setEnlargedImage({ open: true, src: imageSrc, title: imageTitle });
  };

  const handleCloseEnlargedImage = () => {
    setEnlargedImage({ open: false, src: '', title: '' });
  };

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
          🔍 שאילתא - חיפוש רכבים
        </Typography>
        <Typography variant="body1" color="text.secondary">
          חיפוש אוטומטי ומיידי של רכבים לפי מספר רישוי, סוג רכב, דגם, צבע, שם בעלים, כתובת או מספר טלפון
        </Typography>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="חיפוש רכב"
                placeholder="הזן לפחות 2 תווים לחיפוש אוטומטי..."
                helperText="החיפוש מתחיל אוטומטי כשאתה מתחיל להקליד (מ-2 תווים)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={clearSearch} size="small">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ direction: 'rtl' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  onClick={handleSearch}
                  disabled={loading || !searchTerm.trim()}
                  sx={{ flex: 1 }}
                >
                  {loading ? 'מחפש...' : 'חפש מיידי'}
                </Button>
                {searchTerm && (
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={clearSearch}
                  >
                    נקה
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {hasSearched && (
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              תוצאות חיפוש {searchResults.length > 0 && `(${searchResults.length} רכבים נמצאו)`}
            </Typography>
            
            {searchResults.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SearchIcon sx={{ fontSize: 64, color: '#bdc3c7', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  לא נמצאו רכבים התואמים לחיפוש
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  נסה לחפש במונחים אחרים או בדוק את הכתיב
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {(searchResults || []).map((vehicle) => (
                  <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
                    <VehicleCard vehicle={vehicle} onImageClick={handleImageClick} />
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Panel Toggle */}
      {(canManageSystem || canManagePermissions || canDelegatePermissions) && (
        <>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Button
              variant={showAdminPanel ? "contained" : "outlined"}
              startIcon={showAdminPanel ? <CloseIcon /> : <CarIcon />}
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              sx={{ minWidth: 200 }}
            >
              {showAdminPanel ? 'סגור לוח ניהול' : 'לוח ניהול רכבים'}
            </Button>
          </Box>

          {/* Admin Panel */}
          {showAdminPanel && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 0 }}>
                {/* Tabs - Simplified */}
                <Tabs 
                  value={activeTab} 
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  {canManageSystem && (
                    <Tab 
                      label="ניהול רכבים" 
                      icon={<CarIcon />} 
                      iconPosition="start"
                      sx={{ minHeight: 72 }}
                    />
                  )}
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ p: 3 }}>
                  {/* Vehicles Management Tab */}
                  {activeTab === 0 && canManageSystem && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          ניהול רכבים - לוח בקרה
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => openVehicleDialog()}
                        >
                          הוסף רכב חדש
                        </Button>
                      </Box>

                      {adminLoading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress />
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            טוען רשימת רכבים...
                          </Typography>
                        </Box>
                      ) : (
                        <Grid container spacing={2}>
                          {(allVehicles || []).map((vehicle) => (
                            <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
                              <AdminVehicleCard 
                                vehicle={vehicle} 
                                onEdit={() => openVehicleDialog(vehicle)}
                                onDelete={() => deleteVehicle(vehicle.id)}
                              />
                            </Grid>
                          ))}
                          {allVehicles.length === 0 && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                לא נמצאו רכבים במערכת
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      )}
                    </>
                  )}

                  {/* User Permissions Tab */}
                  {(((canManagePermissions || canDelegatePermissions) && activeTab === 1) || (!canManageSystem && (canManagePermissions || canDelegatePermissions) && activeTab === 0)) && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          ניהול הרשאות מערכת רכבים
                        </Typography>
                      </Box>

                      <Grid container spacing={3}>
                        {/* Users List */}
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                              רשימת משתמשים
                            </Typography>
                            {usersLoading ? (
                              <Box sx={{ textAlign: 'center', py: 2 }}>
                                <CircularProgress size={24} />
                              </Box>
                            ) : (
                              <List dense>
                                {(allUsers || []).map((user) => (
                                  <ListItem 
                                    key={user.id}
                                    button
                                    selected={selectedUser?.id === user.id}
                                    onClick={() => {
                                      setSelectedUser(user);
                                      loadUserPermissions(user.id);
                                    }}
                                    sx={{ 
                                      borderRadius: 1,
                                      mb: 0.5,
                                      '&.Mui-selected': {
                                        backgroundColor: 'primary.light',
                                        color: 'primary.contrastText'
                                      }
                                    }}
                                  >
                                    <ListItemAvatar>
                                      <UserAvatar 
                                        user={user} 
                                        size={40} 
                                        clickable={false}
                                      />
                                    </ListItemAvatar>
                                    <ListItemText 
                                      primary={
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                          {user.full_name || user.username}
                                        </Typography>
                                      }
                                      secondary={
                                        <Box>
                                          <Typography variant="body2" color="text.secondary">
                                            {user.role}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            @{user.username}
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            )}
                          </Paper>
                        </Grid>

                        {/* Permissions Panel */}
                        <Grid item xs={12} md={8}>
                          {selectedUser ? (
                            <Paper sx={{ p: 3 }}>
                              <Typography variant="h6" sx={{ mb: 2 }}>
                                הרשאות מערכת רכבים - {selectedUser.full_name}
                              </Typography>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                תפקיד: {selectedUser.role}
                              </Typography>

                              {permissionsLoading ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                  <CircularProgress />
                                </Box>
                              ) : (
                                <>
                                  <Box sx={{ mb: 3 }}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={userPermissions.includes('vehicle_search_access')}
                                          onChange={(e) => handlePermissionChange('vehicle_search_access', e.target.checked)}
                                        />
                                      }
                                      label={
                                        <Box>
                                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            גישה לחיפוש רכבים
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            אפשר למשתמש לחפש ולראות פרטי רכבים במערכת השאילתות
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                  </Box>

                                  {/* Admin permissions - only for users with full management permissions */}
                                  {canManagePermissions && (
                                    <Box sx={{ mb: 3 }}>
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            checked={userPermissions.includes('vehicle_admin_access')}
                                            onChange={(e) => handlePermissionChange('vehicle_admin_access', e.target.checked)}
                                          />
                                        }
                                        label={
                                          <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                              גישה לניהול רכבים
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                              אפשר למשתמש להוסיף, לערוך ולמחוק רכבים במערכת
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                    </Box>
                                  )}

                                  {/* Show note for delegation users about their limitations */}
                                  {canDelegatePermissions && !canManagePermissions && (
                                    <Box sx={{ mb: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                                      <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                                        📝 הערה: ניתן לך להעניק רק הרשאות חיפוש. הרשאות ניהול מערכת זמינות למפתח בלבד.
                                      </Typography>
                                    </Box>
                                  )}

                                  <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                                    <Button
                                      variant="contained"
                                      onClick={savePermissionChanges}
                                      disabled={permissionsLoading}
                                      startIcon={permissionsLoading ? <CircularProgress size={20} /> : null}
                                    >
                                      {permissionsLoading ? 'שומר...' : 'שמור שינויים'}
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      onClick={() => loadUserPermissions(selectedUser.id)}
                                      disabled={permissionsLoading}
                                    >
                                      בטל שינויים
                                    </Button>
                                  </Box>
                                </>
                              )}
                            </Paper>
                          ) : (
                            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                              <SecurityIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                              <Typography variant="h6" sx={{ mb: 1 }}>
                                בחר משתמש לעריכת הרשאות
                              </Typography>
                              <Typography variant="body2">
                                בחר משתמש מהרשימה משמאל כדי לנהל את ההרשאות שלו במערכת הרכבים
                              </Typography>
                            </Paper>
                          )}
                        </Grid>
                      </Grid>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Vehicle FAB */}
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 24, left: 24 }}
            onClick={() => openVehicleDialog()}
          >
            <AddIcon />
          </Fab>
        </>
      )}

      {/* Vehicle Form Dialog */}
      <VehicleFormDialog
        open={showVehicleDialog}
        onClose={closeVehicleDialog}
        vehicle={editingVehicle}
        form={vehicleForm}
        onFormChange={handleFormChange}
        onImageChange={handleImageChange}
        vehicleImagePreview={vehicleImagePreview}
        ownerImagePreview={ownerImagePreview}
        loading={formLoading}
        onSubmit={submitVehicleForm}
      />

      {/* Image Enlargement Modal */}
      <Dialog
        open={enlargedImage.open}
        onClose={handleCloseEnlargedImage}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'white', 
          textAlign: 'center',
          direction: 'rtl',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">{enlargedImage.title}</Typography>
          <IconButton
            onClick={handleCloseEnlargedImage}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.9)'
        }}>
          {enlargedImage.src && (
            <Box
              component="img"
              src={enlargedImage.src}
              alt={enlargedImage.title}
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Vehicle Card Component for Search Results
const VehicleCard = ({ vehicle, onImageClick }) => (
  <Card sx={{ 
    borderRadius: 2, 
    border: '1px solid #e0e6ed',
    '&:hover': { 
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      transform: 'translateY(-2px)',
      transition: 'all 0.3s ease'
    }
  }}>
    <CardContent sx={{ p: 3 }}>
      {/* License Plate Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Chip
          icon={<CarIcon />}
          label={vehicle.license_plate}
          color="primary"
          sx={{ 
            fontWeight: 700,
            fontSize: '1rem',
            height: 40,
            px: 2
          }}
        />
      </Box>

      {/* Vehicle Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          פרטי רכב:
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>סוג:</strong> {vehicle.vehicle_type}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>דגם:</strong> {vehicle.vehicle_model}
        </Typography>
        <Typography variant="body2">
          <strong>צבע:</strong> {vehicle.vehicle_color}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Owner Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          פרטי בעלים:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <PersonIcon sx={{ fontSize: 16, mr: 1, color: '#7f8c8d' }} />
          <Typography variant="body2">{vehicle.owner_name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LocationIcon sx={{ fontSize: 16, mr: 1, color: '#7f8c8d' }} />
          <Typography variant="body2">{vehicle.owner_address}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PhoneIcon sx={{ fontSize: 16, mr: 1, color: '#7f8c8d' }} />
          <Typography variant="body2">{vehicle.owner_phone}</Typography>
        </Box>
      </Box>

      {/* Images */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {vehicle.vehicle_image_url && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              תמונת רכב
            </Typography>
            <Avatar
              src={vehicle.vehicle_image_url}
              sx={{ 
                width: 60, 
                height: 60,
                cursor: 'pointer',
                '&:hover': { 
                  opacity: 0.8,
                  transform: 'scale(1.05)' 
                },
                transition: 'all 0.2s'
              }}
              onClick={() => onImageClick(vehicle.vehicle_image_url, `תמונת רכב - ${vehicle.license_plate}`)}
            >
              <CarIcon />
            </Avatar>
          </Box>
        )}
        {vehicle.owner_image_url && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              תמונת בעלים
            </Typography>
            <Avatar
              src={vehicle.owner_image_url}
              sx={{ 
                width: 60, 
                height: 60,
                cursor: 'pointer',
                '&:hover': { 
                  opacity: 0.8,
                  transform: 'scale(1.05)' 
                },
                transition: 'all 0.2s'
              }}
              onClick={() => onImageClick(vehicle.owner_image_url, `תמונת בעלים - ${vehicle.owner_name}`)}
            >
              <PersonIcon />
            </Avatar>
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
);

// Admin Vehicle Card Component
const AdminVehicleCard = ({ vehicle, onEdit, onDelete }) => (
  <Card sx={{ 
    borderRadius: 2, 
    border: '1px solid #e0e6ed',
    position: 'relative'
  }}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Chip
          label={vehicle.license_plate}
          size="small"
          color="primary"
          sx={{ fontWeight: 600 }}
        />
        <Box>
          <IconButton size="small" onClick={onEdit} sx={{ mr: 1 }}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" onClick={onDelete} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Typography variant="body2" sx={{ mb: 1 }}>
        {vehicle.vehicle_type} - {vehicle.vehicle_model}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {vehicle.owner_name}
      </Typography>
    </CardContent>
  </Card>
);

// Vehicle Form Dialog Component
const VehicleFormDialog = ({
  open,
  onClose,
  vehicle,
  form,
  onFormChange,
  onImageChange,
  vehicleImagePreview,
  ownerImagePreview,
  loading,
  onSubmit
}) => (
  <Dialog 
    open={open} 
    onClose={onClose} 
    maxWidth="md" 
    fullWidth
    PaperProps={{ sx: { direction: 'rtl' } }}
  >
    <DialogTitle>
      {vehicle ? 'עריכת רכב' : 'הוספת רכב חדש'}
    </DialogTitle>
    <DialogContent>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Basic Vehicle Info */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="מספר רישוי *"
            value={form.licensePlate}
            onChange={(e) => onFormChange('licensePlate', e.target.value)}
            placeholder="12-345-67"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="סוג רכב *"
            value={form.vehicleType}
            onChange={(e) => onFormChange('vehicleType', e.target.value)}
            placeholder="סדאן, רכב שטח, האצ'בק..."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="דגם רכב *"
            value={form.vehicleModel}
            onChange={(e) => onFormChange('vehicleModel', e.target.value)}
            placeholder="טויוטה קורולה, פורד פוקוס..."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="צבע רכב *"
            value={form.vehicleColor}
            onChange={(e) => onFormChange('vehicleColor', e.target.value)}
            placeholder="לבן, שחור, כחול..."
          />
        </Grid>

        {/* Owner Info */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>פרטי בעלים</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="שם בעלים *"
            value={form.ownerName}
            onChange={(e) => onFormChange('ownerName', e.target.value)}
            placeholder="שם מלא"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="מספר טלפון *"
            value={form.ownerPhone}
            onChange={(e) => onFormChange('ownerPhone', e.target.value)}
            placeholder="050-1234567"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="כתובת מגורים *"
            value={form.ownerAddress}
            onChange={(e) => onFormChange('ownerAddress', e.target.value)}
            placeholder="רחוב, מספר בית, עיר"
          />
        </Grid>

        {/* Images */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>תמונות</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>תמונת רכב</Typography>
            {vehicleImagePreview && (
              <Avatar
                src={vehicleImagePreview}
                sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
              >
                <CarIcon />
              </Avatar>
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              העלה תמונת רכב
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => onImageChange('vehicleImage', e.target.files[0])}
              />
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>תמונת בעלים</Typography>
            {ownerImagePreview && (
              <Avatar
                src={ownerImagePreview}
                sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
              >
                <PersonIcon />
              </Avatar>
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              העלה תמונת בעלים
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => onImageChange('ownerImage', e.target.files[0])}
              />
            </Button>
          </Box>
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>ביטול</Button>
      <Button
        onClick={onSubmit}
        variant="contained"
        disabled={loading || !form.licensePlate || !form.vehicleType || !form.vehicleModel || 
                 !form.vehicleColor || !form.ownerName || !form.ownerAddress || !form.ownerPhone}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? 'שומר...' : (vehicle ? 'עדכן' : 'הוסף')}
      </Button>
    </DialogActions>
  </Dialog>
);

export default VehicleSearch;
