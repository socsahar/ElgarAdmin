import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Avatar,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  Summarize as SummarizeIcon,
  LockReset as LockResetIcon,
  Security as SecurityIcon,
  PowerOff as PowerOffIcon,
  DirectionsCar as CarIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import api from '../utils/api';
import ImageUpload from '../components/ImageUpload';
import UserAvatar from '../components/UserAvatar';
import UserPermissionsDialog from '../components/UserPermissionsDialog';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone_number: '',
    id_number: '',
    position: '',
    role: 'סייר',
    has_car: true,
    car_type: '',
    license_plate: '',
    car_color: '',
    photo_url: '',
    is_active: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [creatingVehicles, setCreatingVehicles] = useState(false);
  const { isSuperRole, user: currentUser } = useAuth();
  const { canModifyPrivileges, canManageUser, canManageRole, hasPermission, isManagementRole } = usePermissions();

  // Hebrew role options
  const allRoles = [
    { value: 'מפתח', label: 'מפתח' },
    { value: 'אדמין', label: 'אדמין' },
    { value: 'פיקוד יחידה', label: 'פיקוד יחידה' },
    { value: 'מפקד משל"ט', label: 'מפקד משל"ט' },
    { value: 'מוקדן', label: 'מוקדן' },
    { value: 'סייר', label: 'סייר' }
  ];

  // Filter roles based on what current user can manage
  const getAvailableRoles = () => {
    return allRoles.filter(role => canManageRole(role.value));
  };

  // Car colors dropdown options
  const carColors = [
    'לבן',
    'שחור', 
    'אפור',
    'כסף',
    'אדום',
    'צהוב',
    'כתום',
    'ירוק',
    'כחול',
    'סגול',
    'חום'
  ];

  // Validation functions
  const handleNumericInput = (value) => {
    // Allow only numbers and hyphens
    return value.replace(/[^0-9\-]/g, '');
  };

  const handleIdNumberChange = (value) => {
    // Remove everything except numbers for ID
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, id_number: numericValue });
  };

  const handlePhoneChange = (value) => {
    // Allow numbers and hyphens for phone
    const sanitizedValue = handleNumericInput(value);
    setFormData({ ...formData, phone_number: sanitizedValue });
  };

  const handleLicensePlateChange = (value) => {
    // Allow numbers and hyphens for license plate
    const sanitizedValue = handleNumericInput(value);
    setFormData({ ...formData, license_plate: sanitizedValue });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      // Use server API route for consistent behavior
      const response = await api.get('/api/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      console.error('Response:', err.response);
      console.error('Request config:', err.config);
      
      if (err.response) {
        setError(`שגיאה בטעינת המשתמשים: ${err.response.status} - ${err.response.data?.error || err.response.statusText}`);
      } else if (err.request) {
        setError('שגיאה בחיבור לשרת - בדוק שהשרת פועל');
      } else {
        setError('שגיאה בטעינת המשתמשים: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Comprehensive validation
      if (!formData.username || !formData.full_name || !formData.phone_number || 
          !formData.id_number || !formData.position || !formData.role) {
        setError('נא למלא את כל השדות הנדרשים');
        return;
      }

      // Phone number validation (Israeli format)
      const phoneRegex = /^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        setError('מספר הטלפון חייב להיות בפורמט ישראלי תקין (למשל: 0501234567)');
        return;
      }

      // ID number validation (exactly 9 digits)
      const idRegex = /^[0-9]{9}$/;
      if (!idRegex.test(formData.id_number)) {
        setError('תעודת הזהות חייבת להכיל בדיוק 9 ספרות');
        return;
      }

      // Car fields validation if user has a car
      if (formData.has_car) {
        if (!formData.car_type || !formData.license_plate || !formData.car_color) {
          setError('נא למלא את כל פרטי הרכב או לסמן "אין רכב"');
          return;
        }
      }

      // Prepare user data
      const userData = {
        username: formData.username,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        id_number: formData.id_number,
        position: formData.position,
        password: '123456', // Default password
        role: formData.role,
        has_car: formData.has_car,
        car_type: formData.has_car ? formData.car_type : null,
        license_plate: formData.has_car ? formData.license_plate : null,
        car_color: formData.has_car ? formData.car_color : null,
        photo_url: formData.photo_url || null,
        is_active: formData.is_active
      };

      // Use server API route that handles password hashing
      const response = await api.post('/api/users', userData);

      if (response.data) {
        setSuccess('המשתמש נוצר בהצלחה! הסיסמה הראשונית: 123456 (יש לשנות בכניסה הראשונה)');
        setOpenDialog(false);
        resetForm();
        fetchUsers();
      }
    } catch (err) {
      console.error('שגיאה ביצירת משתמש:', err);
      if (err.response?.data?.error) {
        setError('שגיאה ביצירת המשתמש: ' + err.response.data.error);
      } else {
        setError('שגיאה ביצירת המשתמש: ' + err.message);
      }
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return;

      // Validation for update
      if (!formData.full_name || !formData.phone_number || !formData.id_number || !formData.position) {
        setError('נא למלא את כל השדות הנדרשים');
        return;
      }

      // Phone number validation
      const phoneRegex = /^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        setError('מספר הטלפון חייב להיות בפורמט ישראלי תקין');
        return;
      }

      // ID number validation
      const idRegex = /^[0-9]{9}$/;
      if (!idRegex.test(formData.id_number)) {
        setError('תעודת הזהות חייבת להכיל בדיוק 9 ספרות');
        return;
      }

      // Car fields validation if user has a car
      if (formData.has_car) {
        if (!formData.car_type || !formData.license_plate || !formData.car_color) {
          setError('נא למלא את כל פרטי הרכב או לסמן "אין רכב"');
          return;
        }
      }

      const updateData = {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        id_number: formData.id_number,
        position: formData.position,
        role: formData.role,
        has_car: formData.has_car,
        car_type: formData.has_car ? formData.car_type : null,
        license_plate: formData.has_car ? formData.license_plate : null,
        car_color: formData.has_car ? formData.car_color : null,
        photo_url: formData.photo_url || null,
        is_active: formData.is_active
      };

      // Use server API route
      const response = await api.put(`/api/users/${editingUser.id}`, updateData);

      if (response.data) {
        setSuccess('המשתמש עודכן בהצלחה!');
        setOpenDialog(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      }
    } catch (err) {
      console.error('שגיאה בעדכון משתמש:', err);
      if (err.response?.data?.error) {
        setError('שגיאה בעדכון המשתמש: ' + err.response.data.error);
      } else {
        setError('שגיאה בעדכון המשתמש: ' + err.message);
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
      try {
        // Use server API route for consistent behavior
        await api.delete(`/api/users/${userId}`);
        
        setSuccess('המשתמש נמחק בהצלחה!');
        fetchUsers();
      } catch (err) {
        console.error('שגיאה במחיקת משתמש:', err);
        if (err.response?.data?.error) {
          setError('שגיאה במחיקת המשתמש: ' + err.response.data.error);
        } else {
          setError('שגיאה במחיקת המשתמש: ' + err.message);
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      full_name: '',
      phone_number: '',
      id_number: '',
      position: '',
      role: 'סייר',
      has_car: true,
      car_type: '',
      license_plate: '',
      car_color: '',
      photo_url: '',
      is_active: true
    });
  };

  // User Details Modal Functions
  const handleUserRowClick = (user) => {
    setSelectedUserDetails(user);
    setUserDetailsOpen(true);
  };

  const handleCloseUserDetailsModal = () => {
    setUserDetailsOpen(false);
    setSelectedUserDetails(null);
  };

  const handleViewSummary = (user) => {
    // Navigate to summaries page with the user pre-selected
    navigate('/summaries', { 
      state: { 
        selectedUserId: user.id,
        selectedUserName: user.full_name || user.username 
      } 
    });
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`האם אתה בטוח שברצונך לאפס את הסיסמה של ${user.full_name || user.username}?\nהסיסמה תוחזר לברירת המחדל (123456) והמשתמש יידרש לשנות אותה בכניסה הבאה.`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.put(`/api/admin/users/${user.id}/reset-password`);
      
      if (response.data.success) {
        setSuccess(`הסיסמה של ${user.full_name || user.username} אופסה בהצלחה. המשתמש יידרש לשנות את הסיסמה בכניסה הבאה.`);
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.response?.data?.message || 'שגיאה באיפוס הסיסמה');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleForceDisconnect = async (user) => {
    if (!window.confirm(`האם אתה בטוח שברצונך לנתק את ${user.full_name || user.username} מהמערכת?\nהמשתמש יותחבר מחדש בכוח ויצטרך להתחבר מחדש.`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post(`/api/admin/users/${user.id}/force-disconnect`);
      
      if (response.data.success) {
        setSuccess(`${user.full_name || user.username} נותק בהצלחה מהמערכת`);
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (error) {
      console.error('Error forcing disconnect:', error);
      setError(error.response?.data?.message || 'שגיאה בניתוק המשתמש');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissions = (user) => {
    setSelectedUserForPermissions(user);
    setPermissionsDialogOpen(true);
  };

  const handleClosePermissions = () => {
    setPermissionsDialogOpen(false);
    setSelectedUserForPermissions(null);
  };

  const handlePermissionsSaved = (newPermissions) => {
    // Update the user in the users list with new permissions
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === selectedUserForPermissions.id 
          ? { ...user, permissions: newPermissions }
          : user
      )
    );
    setSuccess('הרשאות המשתמש עודכנו בהצלחה');
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleCreateVehiclesForUsers = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לעדכן רכבים עבור כל המשתמשים? פעולה זו תיצור רכבים חדשים עבור משתמשים חסרים ותעדכן רכבים קיימים.')) {
      return;
    }

    setCreatingVehicles(true);
    try {
      const response = await api.post('/api/admin/create-vehicles-for-users');
      if (response.data.success) {
        setSuccess(response.data.message || `עודכנו רכבים עבור ${response.data.count} משתמשים בהצלחה`);
        // Refresh users to show updated data
        fetchUsers();
      } else {
        setError(response.data.message || 'שגיאה בעדכון רכבים');
      }
    } catch (error) {
      console.error('Error creating/updating vehicles for users:', error);
      setError('שגיאה בעדכון רכבים למשתמשים');
    } finally {
      setCreatingVehicles(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingUser(null);
    setOpenDialog(true);
  };

  const openEditDialog = (user) => {
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      id_number: user.id_number || '',
      position: user.position || user.role,
      role: user.role,
      has_car: user.has_car !== false, // Default to true if undefined
      car_type: user.car_type || '',
      license_plate: user.license_plate || '',
      car_color: user.car_color || '',
      photo_url: user.photo_url || '',
      is_active: user.is_active
    });
    setEditingUser(user);
    setOpenDialog(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'מפתח': return 'primary';
      case 'אדמין': return 'secondary';
      case 'פיקוד יחידה': return 'warning';
      case 'מפקד משל"ט': return 'info';
      case 'מוקדן': return 'success';
      case 'סייר': return 'default';
      default: return 'default';
    }
  };

  const filteredUsers = users.filter(user => {
    // Only filter by search terms - show all users regardless of management permissions
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number?.includes(searchTerm) ||
      // Only allow ID number search for מפתח users if current user is also מפתח
      (!(user.role === 'מפתח' && currentUser?.role !== 'מפתח') && user.id_number?.includes(searchTerm)) ||
      user.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.car_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Statistics
  const activeUsers = users.filter(u => u.is_active).length;
  const totalUsers = users.length;
  const adminUsers = users.filter(u => ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(u.role)).length;
  const disconnectedUsers = users.filter(u => !u.is_active).length;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <PeopleIcon sx={{ mr: 2, fontSize: 40 }} />
        ניהול משתמשים
      </Typography>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                סה"כ משתמשים
              </Typography>
              <Typography variant="h4">
                {totalUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                משתמשים פעילים
              </Typography>
              <Typography variant="h4">
                {activeUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                מנהלים ומפקדים
              </Typography>
              <Typography variant="h4">
                {adminUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error.main">
                משתמשים מנותקים
              </Typography>
              <Typography variant="h4">
                {disconnectedUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {hasPermission('access_users_crud') && isManagementRole() && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
              >
                משתמש חדש
              </Button>
            )}
            <Button
              variant="contained"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              disabled={loading}
            >
              רענן
            </Button>
            {hasPermission('access_users_crud') && isManagementRole() && (
              <Button
                variant="contained"
                color="info"
                startIcon={<CarIcon />}
                onClick={handleCreateVehiclesForUsers}
                disabled={creatingVehicles}
              >
                {creatingVehicles ? 'מעדכן רכבים...' : 'עדכן רכבים'}
              </Button>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="חיפוש לפי שם, שם משתמש, טלפון, ת.ז, תפקיד או פרטי רכב..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
        </Grid>
      </Grid>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            רשימת משתמשים ({filteredUsers.length})
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ direction: 'ltr' }}>
              <Table sx={{ direction: 'ltr' }}>
                <TableHead>
                  <TableRow>
                    <TableCell>משתמש</TableCell>
                    <TableCell>תפקיד/רמה</TableCell>
                    <TableCell>פרטי קשר</TableCell>
                    <TableCell>פרטי רכב</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell align="center">פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id}
                      onClick={() => handleUserRowClick(user)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: '#f5f5f5'
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <UserAvatar 
                            user={user}
                            size={40}
                            roleColor={getRoleColor(user.role)}
                          />
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {user.full_name}
                            </Typography>
                            {/* Hide ID number for סייר users and hide מפתח ID from non-מפתח users */}
                            {user.id_number && hasPermission('access_users_crud') && 
                             !(user.role === 'מפתח' && currentUser?.role !== 'מפתח') && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                ת.ז: {user.id_number}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip
                            label={user.role}
                            color={getRoleColor(user.role)}
                            size="small"
                            sx={{ mb: 0.5 }}
                          />
                          {user.position && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {user.position}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {user.phone_number || 'לא צוין'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {user.has_car ? (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {user.car_type || 'לא צוין'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.license_plate || 'ללא לוחית'} • {user.car_color || 'ללא צבע'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            אין רכב
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'פעיל' : 'לא פעיל'}
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {isManagementRole() && canManageUser(user) && user.username !== 'admin' && user.id !== currentUser?.id && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title="עריכה">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(user);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="מחיקה">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user.id);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingUser ? 'עריכת משתמש' : 'יצירת משתמש חדש'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Username */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="שם משתמש *"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                required
                helperText={!editingUser ? "שם משתמש לא ניתן לשינוי לאחר יצירה" : ""}
              />
            </Grid>
            
            {/* Full Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="שם מלא *"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </Grid>
            
            {/* Phone Number */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="מספר טלפון *"
                value={formData.phone_number}
                onChange={(e) => handlePhoneChange(e.target.value)}
                required
                placeholder="050-1234567"
                helperText="רק מספרים ומקפים - פורמט ישראלי"
              />
            </Grid>
            
            {/* ID Number - Hide for מפתח users unless current user is also מפתח */}
            {!(editingUser?.role === 'מפתח' && currentUser?.role !== 'מפתח') && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="תעודת זהות *"
                  value={formData.id_number}
                  onChange={(e) => handleIdNumberChange(e.target.value)}
                  required
                  placeholder="123456789"
                  helperText="9 ספרות בדיוק - רק מספרים"
                  inputProps={{ maxLength: 9 }}
                />
              </Grid>
            )}
            
            {/* Position */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="תפקיד *"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                placeholder="למשל: קצין בכיר, מפקד צוות"
                helperText="תפקיד ספציפי (שונה מרמת הרשאה)"
              />
            </Grid>
            
            {/* Role */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>רמת הרשאה *</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="רמת הרשאה *"
                >
                  {getAvailableRoles().map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Photo Upload */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="תמונת פספורט"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="כתובת URL לתמונה או השאר ריק להעלאה מאוחר יותר"
                helperText="תמונת פספורט רשמית (אופציונלי)"
              />
            </Grid>
            
            {/* Car Information Section */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  פרטי רכב
                </Typography>
                
                {/* No Car Checkbox */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ mr: 1 }}>סמן במידה ואין רכב</Typography>
                  <Switch
                    checked={!formData.has_car}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      has_car: !e.target.checked,
                      // Clear car fields if no car
                      car_type: !e.target.checked ? formData.car_type : '',
                      license_plate: !e.target.checked ? formData.license_plate : '',
                      car_color: !e.target.checked ? formData.car_color : ''
                    })}
                  />
                </Box>
              </Box>
            </Grid>
            
            {/* Car Type */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={`סוג רכב ${formData.has_car ? '*' : ''}`}
                value={formData.car_type}
                onChange={(e) => setFormData({ ...formData, car_type: e.target.value })}
                required={formData.has_car}
                disabled={!formData.has_car}
                placeholder="פרטית, מסחרית, רכב שטח"
                helperText={formData.has_car ? "סוג הרכב נדרש" : "אין רכב"}
              />
            </Grid>
            
            {/* License Plate */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={`לוחית רישוי ${formData.has_car ? '*' : ''}`}
                value={formData.license_plate}
                onChange={(e) => handleLicensePlateChange(e.target.value)}
                required={formData.has_car}
                disabled={!formData.has_car}
                placeholder="123-45-678"
                helperText={formData.has_car ? "רק מספרים ומקפים" : "אין רכב"}
              />
            </Grid>
            
            {/* Car Color */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required={formData.has_car} disabled={!formData.has_car}>
                <InputLabel>{`צבע רכב ${formData.has_car ? '*' : ''}`}</InputLabel>
                <Select
                  value={formData.car_color}
                  onChange={(e) => setFormData({ ...formData, car_color: e.target.value })}
                  label={`צבע רכב ${formData.has_car ? '*' : ''}`}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{formData.has_car ? "בחר צבע רכב" : "אין רכב"}</em>
                  </MenuItem>
                  {carColors.map((color) => (
                    <MenuItem key={color} value={color}>
                      {color}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Active Status */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Typography sx={{ mr: 1 }}>משתמש פעיל</Typography>
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Box>
            </Grid>
            
            {/* Profile Photo Upload */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                <ImageUpload
                  value={formData.photo_url}
                  onChange={(photoUrl) => {
                    console.log('📸 ImageUpload onChange called with:', photoUrl);
                    setFormData({ ...formData, photo_url: photoUrl });
                  }}
                  label="תמונת פרופיל (אופציונלי)"
                  userId={formData.id_number}
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            ביטול
          </Button>
          <Button
            variant="contained"
            onClick={editingUser ? handleUpdateUser : handleCreateUser}
          >
            {editingUser ? 'עדכן' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Modal */}
      <Dialog
        open={userDetailsOpen}
        onClose={handleCloseUserDetailsModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            direction: 'rtl',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e6ed',
          pb: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            פרטי משתמש
          </Typography>
          <IconButton onClick={handleCloseUserDetailsModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedUserDetails && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Header with Avatar and Basic Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <UserAvatar 
                  user={selectedUserDetails}
                  size={80}
                  roleColor={getRoleColor(selectedUserDetails.role)}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedUserDetails.full_name || selectedUserDetails.username}
                  </Typography>
                  <Chip 
                    label={selectedUserDetails.role}
                    color={getRoleColor(selectedUserDetails.role)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <br />
                  <Chip 
                    label={selectedUserDetails.is_active ? 'פעיל' : 'לא פעיל'}
                    color={selectedUserDetails.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Personal Information - Restricted for סייר users */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                פרטים אישיים
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    label="שם מלא"
                    value={selectedUserDetails.full_name || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="טלפון"
                    value={selectedUserDetails.phone_number || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="תפקיד"
                    value={selectedUserDetails.role || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="מעמד"
                    value={selectedUserDetails.position || 'לא צוין'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                
                {/* Additional fields only for non-סייר users */}
                {!hasPermission('view_users_info') || hasPermission('access_users_crud') ? (
                  <>
                    <Grid item xs={6}>
                      <TextField
                        label="שם משתמש"
                        value={selectedUserDetails.username || 'לא צוין'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                      />
                    </Grid>
                    {/* Hide ID number for מפתח users unless current user is also מפתח */}
                    {!(selectedUserDetails.role === 'מפתח' && currentUser?.role !== 'מפתח') && (
                      <Grid item xs={6}>
                        <TextField
                          label="תעודת זהות"
                          value={selectedUserDetails.id_number || 'לא צוין'}
                          fullWidth
                          InputProps={{ readOnly: true }}
                          variant="outlined"
                        />
                      </Grid>
                    )}
                  </>
                ) : null}
              </Grid>

              {/* Car Information */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                פרטי רכב
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <TextField
                    label="סטטוס רכב"
                    value={selectedUserDetails.has_car ? 'יש רכב' : 'אין רכב'}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                {selectedUserDetails.has_car && (
                  <>
                    <Grid item xs={4}>
                      <TextField
                        label="סוג רכב"
                        value={selectedUserDetails.car_type || 'לא צוין'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="לוחית רישוי"
                        value={selectedUserDetails.license_plate || 'לא צוין'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="צבע רכב"
                        value={selectedUserDetails.car_color || 'לא צוין'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Account Information - Only for non-סייר users */}
              {!hasPermission('view_users_info') || hasPermission('access_users_crud') ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    מידע חשבון
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="תאריך רישום"
                        value={selectedUserDetails.created_at ? 
                          new Date(selectedUserDetails.created_at).toLocaleDateString('he-IL') : 
                          'לא זמין'
                        }
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="עדכון אחרון"
                        value={selectedUserDetails.updated_at ? 
                          new Date(selectedUserDetails.updated_at).toLocaleDateString('he-IL') : 
                          'לא זמין'
                        }
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </>
              ) : null}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          {isManagementRole() && hasPermission('access_users_crud') && canManageUser(selectedUserDetails) && selectedUserDetails?.id !== currentUser?.id && (
            <Button 
              onClick={() => handleResetPassword(selectedUserDetails)}
              variant="outlined"
              startIcon={<LockResetIcon />}
              sx={{ 
                borderColor: '#e74c3c',
                color: '#e74c3c',
                '&:hover': { 
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  borderColor: '#e74c3c'
                },
                minWidth: 120,
                mr: 1
              }}
            >
              איפוס סיסמה
            </Button>
          )}
          {currentUser?.role === 'מפתח' && selectedUserDetails?.id !== currentUser?.id && (
            <Button 
              onClick={() => handleForceDisconnect(selectedUserDetails)}
              variant="outlined"
              startIcon={<PowerOffIcon />}
              sx={{ 
                borderColor: '#f39c12',
                color: '#f39c12',
                '&:hover': { 
                  backgroundColor: '#f39c12',
                  color: 'white',
                  borderColor: '#f39c12'
                },
                minWidth: 120,
                mr: 1
              }}
            >
              ניתוק בכפיה
            </Button>
          )}
          {canModifyPrivileges() && canManageUser(selectedUserDetails) && selectedUserDetails?.id !== currentUser?.id && (
            <Button 
              onClick={() => handleOpenPermissions(selectedUserDetails)}
              variant="outlined"
              startIcon={<SecurityIcon />}
              sx={{ 
                borderColor: '#3498db',
                color: '#3498db',
                '&:hover': { 
                  backgroundColor: '#3498db',
                  color: 'white',
                  borderColor: '#3498db'
                },
                minWidth: 120,
                mr: 1
              }}
            >
              הרשאות
            </Button>
          )}
          {/* Show Summary button only for users with summaries access permissions */}
          {(hasPermission('access_summaries') || hasPermission('view_own_summaries')) && (
            <Button 
              onClick={() => handleViewSummary(selectedUserDetails)}
              variant="outlined"
              startIcon={<SummarizeIcon />}
              sx={{ 
                borderColor: '#9b59b6',
                color: '#9b59b6',
                '&:hover': { 
                  backgroundColor: '#9b59b6',
                  color: 'white',
                  borderColor: '#9b59b6'
                },
                minWidth: 120,
                mr: 1
              }}
            >
              צפה בסיכום
            </Button>
          )}
          <Button 
            onClick={handleCloseUserDetailsModal}
            variant="contained"
            sx={{ 
              backgroundColor: '#3498db',
              '&:hover': { backgroundColor: '#2980b9' },
              minWidth: 120
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Permissions Dialog */}
      <UserPermissionsDialog
        open={permissionsDialogOpen}
        onClose={handleClosePermissions}
        user={selectedUserForPermissions}
        onSave={handlePermissionsSaved}
      />
    </Box>
  );
};

export default Users;
