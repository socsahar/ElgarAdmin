import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { usePermissions } from '../contexts/PermissionsContext';

const PERMISSION_LABELS = {
  'access_users_crud': 'ניהול משתמשים',
  'access_events_crud': 'ניהול אירועים',
  'access_analytics': 'גישה לאנליטיקה',
  'access_summaries': 'גישה לסיכומים',
  'access_action_reports': 'בדיקת דוחות פעולה',
  'can_modify_privileges': 'שינוי הרשאות',
  'can_connect_to_website': 'התחברות לאתר',
  'גישה לאתר': 'גישה לאתר',
  'view_dashboard_events': 'צפייה בלוח בקרה - אירועים',
  'view_users_info': 'צפייה במידע משתמשים',
  'view_events_list': 'צפייה ברשימת אירועים',
  'manage_own_action_reports': 'ניהול דוחות פעולה אישיים',
  'view_own_summaries': 'צפייה בסיכומים אישיים'
};

const PERMISSION_DESCRIPTIONS = {
  'access_users_crud': 'יצירה, עריכה, שינוי ומחיקה של משתמשים',
  'access_events_crud': 'יצירה, עריכה, שינוי, הקצאה ומחיקה של אירועים',
  'access_analytics': 'צפייה בדף האנליטיקה והדוחות',
  'access_summaries': 'צפייה בדף הסיכומים והסטטיסטיקות',
  'access_action_reports': 'צפייה ובדיקה של דוחות פעולה',
  'can_modify_privileges': 'יכולת לשנות הרשאות למשתמשים אחרים',
  'can_connect_to_website': 'יכולת להתחבר לאתר ולצפות באירועים שלו ולכתוב דוחות פעולה',
  'גישה לאתר': 'הרשאה בסיסית לגישה לאתר הניהול',
  'view_dashboard_events': 'צפייה בכרטיסי האירועים הפעילים והסגורים בלוח הבקרה',
  'view_users_info': 'צפייה ברשימת המשתמשים ומידע פרופיל בסיסי (ללא ניהול)',
  'view_events_list': 'צפייה ברשימת האירועים והשימוש בפילטרים (ללא עריכה)',
  'manage_own_action_reports': 'כתיבה וניהול של דוחות פעולה רק לאירועים המוקצים למשתמש',
  'view_own_summaries': 'צפייה בסיכומי אירועים אישיים בלבד (ללא יצוא Excel)'
};

const ROLE_ICONS = {
  'מפתח': <AdminIcon color="error" />,
  'אדמין': <AdminIcon color="warning" />,
  'פיקוד יחידה': <SecurityIcon color="primary" />,
  'מפקד משל"ט': <SecurityIcon color="secondary" />,
  'מוקדן': <PersonIcon color="info" />,
  'סייר': <PersonIcon color="action" />
};

const UserPermissionsDialog = ({ open, onClose, user, onSave }) => {
  const { 
    canModifyPrivileges, 
    canManageUser, 
    updateUserPermissions,
    getAvailablePermissions,
    getRoleDefaults 
  } = usePermissions();
  
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [defaultPermissions, setDefaultPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load available permissions
      const permissions = await getAvailablePermissions();
      setAvailablePermissions(permissions);

      // Load role defaults
      const defaults = await getRoleDefaults(user.role);
      setDefaultPermissions(defaults);

      // Load current user permissions
      setSelectedPermissions(user.permissions || defaults);
    } catch (error) {
      console.error('Error loading permissions data:', error);
      setError('שגיאה בטעינת נתוני ההרשאות');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const resetToDefaults = () => {
    setSelectedPermissions([...defaultPermissions]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await updateUserPermissions(user.id, selectedPermissions);
      
      if (onSave) {
        onSave(selectedPermissions);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError('שגיאה בשמירת ההרשאות');
    } finally {
      setSaving(false);
    }
  };

  // Check if user can modify permissions for this target user
  const canModify = canModifyPrivileges() && canManageUser(user);

  if (!user) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { direction: 'rtl' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {ROLE_ICONS[user.role]}
        <Box>
          <Typography variant="h6">
            הרשאות משתמש - {user.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            תפקיד: {user.role}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!canModify ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            אין לך הרשאה לשנות הרשאות למשתמש זה
          </Alert>
        ) : null}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Current Role Info */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                הרשאות ברירת מחדל לתפקיד {user.role}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {defaultPermissions.map(permission => (
                  <Chip
                    key={permission}
                    label={PERMISSION_LABELS[permission]}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              {canModify && (
                <Button
                  size="small"
                  onClick={resetToDefaults}
                  sx={{ mt: 1 }}
                  disabled={!canModify}
                >
                  חזור לברירת מחדל
                </Button>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Permission Selection */}
            <FormControl component="fieldset" variant="standard" fullWidth>
              <FormLabel component="legend">
                <Typography variant="h6" gutterBottom>
                  הרשאות מותאמות אישית
                </Typography>
              </FormLabel>
              
              <FormGroup>
                {availablePermissions.map((permission) => (
                  <Box key={permission.key} sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => handlePermissionChange(permission.key)}
                          disabled={!canModify}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {permission.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.description}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                ))}
              </FormGroup>
            </FormControl>

            {/* Current Selection Summary */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                הרשאות נבחרות ({selectedPermissions.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedPermissions.map(permission => (
                  <Chip
                    key={permission}
                    label={PERMISSION_LABELS[permission]}
                    size="small"
                    color="primary"
                  />
                ))}
                {selectedPermissions.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    לא נבחרו הרשאות מיוחדות - רק הרשאות בסיסיות
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          ביטול
        </Button>
        {canModify && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || saving || !canModify}
            startIcon={saving ? <CircularProgress size={16} /> : <SecurityIcon />}
          >
            {saving ? 'שומר...' : 'שמור הרשאות'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserPermissionsDialog;
