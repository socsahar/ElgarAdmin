import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Divider,
  Avatar,
  useMediaQuery,
  useTheme,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Assignment as ReportIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Print as PrintIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';
import UserAvatar from '../components/UserAvatar';
import api from '../utils/api';

// Separate ReportForm component to prevent re-rendering issues
const ReportFormComponent = ({ formData, setFormData, selectedReport, user }) => (
  <Grid container spacing={3}>
    {/* Header Information */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        פרטי האירוע והמדווח
      </Typography>
      <Divider sx={{ mb: 2 }} />
    </Grid>

    {/* Event and User Info - Read Only */}
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="תאריך האירוע"
        value={selectedReport?.event ? new Date(selectedReport.event.created_at).toLocaleDateString('he-IL') : ''}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="שעת האירוע"
        value={selectedReport?.event ? new Date(selectedReport.event.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="תאריך כתיבת הדוח"
        value={new Date().toLocaleDateString('he-IL')}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="שעת כתיבת הדוח"
        value={new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        disabled
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        label="מקום האירוע"
        value={selectedReport?.event?.full_address || ''}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="שם המדווח"
        value={user?.full_name || user?.username || ''}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="תעודת זהות"
        value={user?.id_number || ''}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="טלפון"
        value={user?.phone_number || ''}
        disabled
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="יחידה"
        value="יחידת אלג״ר"
        disabled
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        label="תפקיד"
        value={formData.volunteer_role}
        onChange={(e) => setFormData({ ...formData, volunteer_role: e.target.value })}
        required
      />
    </Grid>

    {/* Partner Information */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        פרטי שותף (אם היה)
      </Typography>
      <Divider sx={{ mb: 2 }} />
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.has_partner}
            onChange={(e) => setFormData({ ...formData, has_partner: e.target.checked })}
          />
        }
        label="היה שותף באירוע"
      />
    </Grid>
    {formData.has_partner && (
      <>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="שם השותף"
            value={formData.partner_name}
            onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="תעודת זהות השותף"
            value={formData.partner_id_number}
            onChange={(e) => setFormData({ ...formData, partner_id_number: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="טלפון השותף"
            value={formData.partner_phone}
            onChange={(e) => setFormData({ ...formData, partner_phone: e.target.value })}
          />
        </Grid>
      </>
    )}

    {/* Report Content */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        פירוט האירוע
      </Typography>
      <Divider sx={{ mb: 2 }} />
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        multiline
        rows={8}
        label="פירוט מלא של האירוע"
        value={formData.full_report}
        onChange={(e) => setFormData({ ...formData, full_report: e.target.value })}
        required
        placeholder="נא לתאר בפירוט את מהלך האירוע, הפעולות שבוצעו, ותוצאות הטיפול..."
      />
    </Grid>

    {/* Digital Signature */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        חתימה דיגיטלית
      </Typography>
      <Divider sx={{ mb: 2 }} />
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.digital_signature}
            onChange={(e) => setFormData({ ...formData, digital_signature: e.target.checked })}
            required
          />
        }
        label={
          <span>
            בסימון על תיבה זו אני חותם דיגיטלית על דוח זה ומאשר כי הפרטים המופיעים בו נכונים ומדויקים
            <span style={{ color: 'red', marginRight: '4px' }}> *</span>
          </span>
        }
      />
    </Grid>
  </Grid>
);

const ActionReports = () => {
  const { user } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [dialogType, setDialogType] = useState('create'); // 'create', 'edit', 'view'
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Mobile responsiveness
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Form state for creating/editing reports
  const [formData, setFormData] = useState({
    event_id: '',
    has_partner: false,
    partner_name: '',
    partner_id_number: '',
    partner_phone: '',
    volunteer_role: '',
    full_report: '',
    digital_signature: false
  });

  const canManageAllReports = hasPermission(user, 'access_action_reports');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadMyReports(),
        loadAssignedEvents(),
        canManageAllReports && loadAllReports()
      ].filter(Boolean));
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMyReports = async () => {
    try {
      const response = await api.get('/api/action-reports/my-reports');
      setMyReports(response.data || []);
    } catch (error) {
      console.error('Error loading my reports:', error);
    }
  };

  const loadAllReports = async () => {
    try {
      const response = await api.get('/api/action-reports');
      setReports(response.data || []);
    } catch (error) {
      console.error('Error loading all reports:', error);
    }
  };

  const loadAssignedEvents = async () => {
    try {
      const response = await api.get('/api/action-reports/assigned-events');
      setAssignedEvents(response.data || []);
    } catch (error) {
      console.error('Error loading assigned events:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateReport = (event) => {
    setFormData({
      event_id: event.id,
      has_partner: false,
      partner_name: '',
      partner_id_number: '',
      partner_phone: '',
      volunteer_role: user.position || user.role || '',
      full_report: '',
      digital_signature: false
    });
    setSelectedReport({ event, isNew: true });
    setDialogType('create');
    setOpenDialog(true);
  };

  const handleEditReport = (report) => {
    setFormData({
      event_id: report.event_id,
      has_partner: report.has_partner || false,
      partner_name: report.partner_name || '',
      partner_id_number: report.partner_id_number || '',
      partner_phone: report.partner_phone || '',
      volunteer_role: report.volunteer_role || '',
      full_report: report.full_report || '',
      digital_signature: report.digital_signature || false
    });
    setSelectedReport(report);
    setDialogType('edit');
    setOpenDialog(true);

    // Show rejection reason if report was rejected
    if (report.status === 'נדחה' && report.review_notes) {
      setTimeout(() => {
        showSnackbar(`סיבת דחיית הדוח: ${report.review_notes}`, 'error');
      }, 500);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setOpenViewDialog(true);
  };

  const handleReviewReport = (report) => {
    setSelectedReport(report);
    setReviewNotes('');
    setOpenReviewDialog(true);
  };

  const handleSaveReport = async () => {
    try {
      if (!formData.full_report.trim()) {
        showSnackbar('נא למלא את פירוט האירוע', 'error');
        return;
      }

      if (!formData.digital_signature) {
        showSnackbar('נא לאשר חתימה דיגיטלית', 'error');
        return;
      }

      const reportData = {
        ...formData,
        status: 'הוגש'
      };

      if (dialogType === 'create') {
        await api.post('/api/action-reports', reportData);
        showSnackbar('הדוח נשלח בהצלחה לבדיקה', 'success');
      } else {
        await api.put(`/api/action-reports/${selectedReport.id}`, reportData);
        showSnackbar('הדוח עודכן ונשלח לבדיקה', 'success');
      }

      setOpenDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving report:', error);
      const errorMessage = error.response?.data?.error || 'שגיאה בשמירת הדוח';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleReviewAction = async (action) => {
    try {
      // Validate that comments are provided for rejection
      if (action === 'reject' && !reviewNotes.trim()) {
        showSnackbar('נא להוסיף הערות לדחיית הדוח', 'error');
        return;
      }

      await api.post(`/api/action-reports/${selectedReport.id}/review`, {
        action,
        review_notes: reviewNotes.trim()
      });

      const successMessage = action === 'approve' ? 'הדוח אושר בהצלחה' : 'הדוח נדחה והוחזר למדווח';
      showSnackbar(successMessage, 'success');
      
      // Clear review notes and close dialog
      setReviewNotes('');
      setOpenReviewDialog(false);
      
      // Reload data to refresh the status
      loadData();
    } catch (error) {
      console.error('Error reviewing report:', error);
      const errorMessage = error.response?.data?.error || 'שגיאה בביצוע הפעולה';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handlePrintReport = async (reportId) => {
    try {
      const response = await api.get(`/api/action-reports/${reportId}/print`, {
        responseType: 'text'
      });
      
      // Open new window with the HTML content
      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(response.data);
      printWindow.document.close();
      
      // Wait for images and content to load, then print
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 1000); // Give extra time for content to render
      });
      
      // Fallback if load event doesn't fire
      setTimeout(() => {
        if (printWindow.document.readyState === 'complete') {
          printWindow.focus();
          printWindow.print();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error printing report:', error);
      showSnackbar('שגיאה בהדפסת הדוח', 'error');
    }
  };

  const handlePreviewReport = async (reportId) => {
    try {
      const response = await api.get(`/api/action-reports/${reportId}/print`, {
        responseType: 'text'
      });
      
      // Open new window with the HTML content for preview
      const previewWindow = window.open('', '_blank');
      previewWindow.document.write(response.data);
      previewWindow.document.close();
      
    } catch (error) {
      console.error('Error previewing report:', error);
      showSnackbar('שגיאה בתצוגה מקדימה של הדוח', 'error');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'טיוטה': 'default',
      'הוגש': 'warning',
      'נבדק': 'info',
      'אושר': 'success',
      'נדחה': 'error'
    };
    return colors[status] || 'default';
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'מפתח': 'מפתח',
      'אדמין': 'אדמין', 
      'פיקוד יחידה': 'פיקוד יחידה',
      'מפקד משל"ט': 'מפקד משל"ט',
      'מוקדן': 'מוקדן',
      'סייר': 'סייר'
    };
    return roleMap[role] || role;
  };

  // Tab content components
  const MyReportsTab = () => (
    <Box>
      {/* Events requiring reports */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            אירועים הדורשים דוח פעולה
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {assignedEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              אין אירועים הדורשים דוח פעולה
            </Typography>
          ) : (
            // Desktop Table View
            !isMobile ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>כותרת</strong></TableCell>
                    <TableCell><strong>תאריך</strong></TableCell>
                    <TableCell><strong>מיקום</strong></TableCell>
                    <TableCell><strong>פעולות</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignedEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.title}</TableCell>
                      <TableCell>
                        {new Date(event.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>{event.full_address}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleCreateReport(event)}
                          variant="contained"
                          color="primary"
                        >
                          כתוב דוח
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              // Mobile Card View
              <Stack spacing={2}>
                {assignedEvents.map((event) => (
                  <Card key={event.id} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {event.title}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          תאריך:
                        </Typography>
                        <Typography variant="body2">
                          {new Date(event.created_at).toLocaleDateString('he-IL')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          מיקום:
                        </Typography>
                        <Typography variant="body2" noWrap>
                          {event.full_address}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          startIcon={<AddIcon />}
                          onClick={() => handleCreateReport(event)}
                          variant="contained"
                          color="primary"
                          size="small"
                        >
                          כתוב דוח
                        </Button>
                      </Grid>
                    </Grid>
                  </Card>
                ))}
              </Stack>
            )
          )}
        </CardContent>
      </Card>

      {/* My submitted reports */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            הדוחות שלי
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {myReports.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              לא נמצאו דוחות
            </Typography>
          ) : (
            // Desktop Table View
            !isMobile ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>אירוע</strong></TableCell>
                    <TableCell><strong>תאריך כתיבה</strong></TableCell>
                    <TableCell><strong>סטטוס</strong></TableCell>
                    <TableCell><strong>נבדק על ידי</strong></TableCell>
                    <TableCell><strong>פעולות</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.event?.title}</TableCell>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={report.status} 
                          color={getStatusColor(report.status)}
                          size="small"
                        />
                        {report.status === 'נדחה' && report.review_notes && (
                          <Tooltip title={`סיבת הדחיה: ${report.review_notes}`} arrow>
                            <Alert 
                              severity="error" 
                              sx={{ mt: 1 }}
                            >
                              <Typography variant="caption">
                                דוח נדחה - ראה סיבה בעריכה
                              </Typography>
                            </Alert>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.reviewed_by?.full_name || 'לא נבדק'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handlePreviewReport(report.id)}
                          title="תצוגה מקדימה"
                        >
                          <ViewIcon />
                        </IconButton>
                        {(report.status === 'נדחה' || report.status === 'טיוטה') && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditReport(report)}
                            title="ערוך דוח"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {canManageAllReports && (
                          <IconButton
                            size="small"
                            onClick={() => handlePrintReport(report.id)}
                            title="הדפס דוח"
                          >
                            <PrintIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              // Mobile Card View
              <Stack spacing={2}>
                {myReports.map((report) => (
                  <Card key={report.id} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {report.event?.title}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          תאריך כתיבה:
                        </Typography>
                        <Typography variant="body2">
                          {new Date(report.created_at).toLocaleDateString('he-IL')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          נבדק על ידי:
                        </Typography>
                        <Typography variant="body2">
                          {report.reviewed_by?.full_name || 'לא נבדק'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          סטטוס:
                        </Typography>
                        <Chip 
                          label={report.status} 
                          color={getStatusColor(report.status)}
                          size="small"
                        />
                        {report.status === 'נדחה' && report.review_notes && (
                          <Alert 
                            severity="error" 
                            sx={{ mt: 1 }}
                          >
                            <Typography variant="caption">
                              דוח נדחה - ראה סיבה בעריכה
                            </Typography>
                          </Alert>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handlePreviewReport(report.id)}
                            variant="outlined"
                          >
                            צפה
                          </Button>
                          {(report.status === 'נדחה' || report.status === 'טיוטה') && (
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditReport(report)}
                              variant="outlined"
                            >
                              ערוך
                            </Button>
                          )}
                          {canManageAllReports && (
                            <Button
                              size="small"
                              startIcon={<PrintIcon />}
                              onClick={() => handlePrintReport(report.id)}
                              variant="outlined"
                            >
                              הדפס
                            </Button>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                ))}
              </Stack>
            )
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const AllReportsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          כל הדוחות לביקורת
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {reports.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            לא נמצאו דוחות
          </Typography>
        ) : isMobile ? (
          // Mobile Card View
          <Stack spacing={2}>
            {reports.map((report) => (
              <Card key={report.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserAvatar 
                        user={report.volunteer} 
                        size={24} 
                        clickable={false}
                      />
                      <Typography variant="subtitle2">
                        {report.volunteer?.full_name}
                      </Typography>
                    </Box>
                    <Chip 
                      label={report.status} 
                      color={getStatusColor(report.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>אירוע:</strong> {report.event?.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>תאריך כתיבה:</strong> {new Date(report.created_at).toLocaleDateString('he-IL')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handlePreviewReport(report.id)}
                      variant="outlined"
                    >
                      תצוגה מקדימה
                    </Button>
                    {(report.status === 'הוגש' || report.status === 'נבדק') && (
                      <Button
                        size="small"
                        startIcon={<ReportIcon />}
                        onClick={() => handleReviewReport(report)}
                        variant="outlined"
                        color="primary"
                      >
                        בדוק דוח
                      </Button>
                    )}
                    {canManageAllReports && (
                      <Button
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrintReport(report.id)}
                        variant="outlined"
                      >
                        הדפס דוח
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          // Desktop Table View
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>מדווח</strong></TableCell>
                <TableCell><strong>אירוע</strong></TableCell>
                <TableCell><strong>תאריך כתיבה</strong></TableCell>
                <TableCell><strong>סטטוס</strong></TableCell>
                <TableCell><strong>פעולות</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserAvatar 
                        user={report.volunteer} 
                        size={24} 
                        clickable={false}
                      />
                      {report.volunteer?.full_name}
                    </Box>
                  </TableCell>
                  <TableCell>{report.event?.title}</TableCell>
                  <TableCell>
                    {new Date(report.created_at).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={report.status} 
                      color={getStatusColor(report.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handlePreviewReport(report.id)}
                      title="תצוגה מקדימה"
                    >
                      <ViewIcon />
                    </IconButton>
                    {(report.status === 'הוגש' || report.status === 'נבדק') && (
                      <IconButton
                        size="small"
                        onClick={() => handleReviewReport(report)}
                        title="בדוק דוח"
                        color="primary"
                      >
                        <ReportIcon />
                      </IconButton>
                    )}
                    {canManageAllReports && (
                      <IconButton
                        size="small"
                        onClick={() => handlePrintReport(report.id)}
                        title="הדפס דוח"
                      >
                        <PrintIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        דוחות פעולה
      </Typography>

      {canManageAllReports ? (
        <Box>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="הדוחות שלי" />
            <Tab label="כל הדוחות" />
          </Tabs>
          <Box sx={{ mt: 3 }}>
            {tabValue === 0 ? <MyReportsTab /> : <AllReportsTab />}
          </Box>
        </Box>
      ) : (
        <MyReportsTab />
      )}

      {/* Report Dialog - Create/Edit */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'create' ? 'כתיבת דוח פעולה חדש' : 
           selectedReport?.status === 'נדחה' ? 'תיקון דוח שנדחה' : 'עריכת דוח פעולה'}
        </DialogTitle>
        <DialogContent>
          {selectedReport?.status === 'נדחה' && selectedReport?.review_notes && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                הדוח נדחה - סיבת הדחיה:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {selectedReport.review_notes}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                נא לתקן את הבעיות המצוינות לעיל לפני הגשה מחדש
              </Typography>
            </Alert>
          )}
          <ReportFormComponent 
            formData={formData}
            setFormData={setFormData}
            selectedReport={selectedReport}
            user={user}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            ביטול
          </Button>
          <Button onClick={handleSaveReport} variant="contained">
            שמור ושלח לבדיקה
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>צפייה בדוח פעולה</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedReport.event?.title}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  נוצר על ידי: {selectedReport.volunteer_full_name} | 
                  תאריך: {new Date(selectedReport.created_at).toLocaleDateString('he-IL')}
                </Typography>
                <Chip 
                  label={selectedReport.status} 
                  color={
                    selectedReport.status === 'אושר' ? 'success' : 
                    selectedReport.status === 'נדחה' ? 'error' : 
                    selectedReport.status === 'נבדק' ? 'warning' : 'default'
                  }
                  size="small"
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedReport.full_report}
              </Typography>
              {selectedReport.review_notes && (
                <Box sx={{ mt: 2 }}>
                  {selectedReport.status === 'נדחה' ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        הדוח נדחה - נדרש תיקון:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {selectedReport.review_notes}
                      </Typography>
                      {selectedReport.reviewed_by_name && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                          נדחה על ידי: {selectedReport.reviewed_by_name} | {new Date(selectedReport.reviewed_at).toLocaleDateString('he-IL')}
                        </Typography>
                      )}
                    </Alert>
                  ) : (
                    <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        הערות מבדק:
                      </Typography>
                      <Typography variant="body2">
                        {selectedReport.review_notes}
                      </Typography>
                      {selectedReport.reviewed_by_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          נבדק על ידי: {selectedReport.reviewed_by_name} | {new Date(selectedReport.reviewed_at).toLocaleDateString('he-IL')}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {canManageAllReports && (
            <Button 
              startIcon={<PrintIcon />} 
              onClick={() => {
                setOpenViewDialog(false);
                handlePrintReport(selectedReport.id);
              }}
            >
              הדפס
            </Button>
          )}
          <Button onClick={() => setOpenViewDialog(false)}>
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={openReviewDialog}
        onClose={() => setOpenReviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReportIcon color="primary" />
            ביקורת דוח פעולה
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                פרטי הדוח
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    מדווח:
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.volunteer_full_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    אירוע:
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.event?.title}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    תאריך כתיבה:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedReport.created_at).toLocaleDateString('he-IL')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    סטטוס נוכחי:
                  </Typography>
                  <Chip 
                    label={selectedReport.status} 
                    color={getStatusColor(selectedReport.status)}
                    size="small"
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                תוכן הדוח:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedReport.full_report}
                </Typography>
              </Paper>
            </Box>
          )}
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            הערות לביקורת
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="הערות (חובה במקרה של דחיה)"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="הוסף הערות לגבי הדוח. במקרה של דחיה, נא לפרט מה צריך לתקן..."
            helperText="הערות אלה יהיו גלויות למדווח"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setOpenReviewDialog(false)}>
            ביטול
          </Button>
          <Button 
            onClick={() => handleReviewAction('reject')}
            color="error"
            startIcon={<RejectedIcon />}
            disabled={!reviewNotes.trim()}
          >
            דחה דוח
          </Button>
          <Button 
            onClick={() => handleReviewAction('approve')}
            color="success"
            startIcon={<ApprovedIcon />}
            variant="contained"
          >
            אשר דוח
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ActionReports;