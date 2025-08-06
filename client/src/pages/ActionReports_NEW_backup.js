import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  CircularProgress,
  Divider,
  Avatar
} from '@mui/material';
import {
  Assignment as ReportIcon,
  Visibility as ViewIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../config/supabase';

const ActionReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, isSuperRole } = useAuth();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('action_reports')
        .select(`
          *,
          volunteer:volunteer_id(full_name, username),
          event:event_id(title, full_address),
          reviewer:reviewed_by_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('שגיאה בטעינת הדוחות:', err);
      setError('שגיאה בטעינת הדוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId, status, notes) => {
    try {
      const { error } = await supabase
        .from('action_reports')
        .update({
          status,
          reviewed_by_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes
        })
        .eq('id', reportId);

      if (error) throw error;

      setSuccess(`הדוח ${status === 'אושר' ? 'אושר' : 'נדחה'} בהצלחה!`);
      setOpenDialog(false);
      fetchReports();
    } catch (err) {
      console.error('שגיאה בעדכון הדוח:', err);
      setError('שגיאה בעדכון הדוח: ' + err.message);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הדוח? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('action_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setSuccess('הדוח נמחק בהצלחה!');
      setOpenDialog(false);
      fetchReports();
    } catch (err) {
      console.error('שגיאה במחיקת הדוח:', err);
      setError('שגיאה במחיקת הדוח: ' + err.message);
    }
  };

  const handlePrintReport = (report) => {
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintableContent(report);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleSaveAsReport = (report) => {
    const content = generateTextContent(report);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `דוח_פעולה_${report.volunteer_full_name}_${new Date(report.report_date).toLocaleDateString('he-IL').replace(/\//g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviewReport = (report) => {
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    const previewContent = generatePrintableReport(report);
    
    previewWindow.document.write(previewContent);
    previewWindow.document.close();
  };

  const generatePrintableReport = (report) => {
    // Format times
    const reportTimestamp = `${new Date(report.report_date).toLocaleDateString('he-IL')} בשעה ${report.report_time}`;
    const eventTimestamp = `${new Date(report.event_date).toLocaleDateString('he-IL')} בשעה ${report.event_time}`;

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>דוח פעולה - ${report.volunteer_full_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: white;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #003366;
          }
          .logo {
            text-align: center;
            flex: 1;
          }
          .org-name {
            font-size: 16px;
            font-weight: bold;
            color: #003366;
            margin-bottom: 5px;
          }
          .org-id {
            font-size: 12px;
            color: #666;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .date-line {
            font-size: 14px;
            margin-bottom: 10px;
          }
          .subject-line {
            font-size: 18px;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 20px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 2px solid #333;
          }
          .info-table th, .info-table td {
            border: 1px solid #333;
            padding: 8px 12px;
            text-align: center;
            font-size: 14px;
          }
          .info-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 2px solid #003366;
            color: #003366;
          }
          .field-row {
            display: flex;
            margin-bottom: 8px;
            align-items: center;
          }
          .field-label {
            font-weight: bold;
            min-width: 120px;
            margin-left: 10px;
          }
          .field-value {
            flex: 1;
          }
          .report-content {
            background-color: #f9f9f9;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.8;
            min-height: 200px;
          }
          .partner-section {
            background-color: #fff8dc;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin: 15px 0;
          }
          .signature-area {
            margin-top: 50px;
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 200px;
            margin: 20px auto;
          }
          .digital-signature {
            border: 2px solid #007acc;
            background-color: #e3f2fd;
            padding: 10px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">יחידת אלג"ר</div>
          </div>
          <div class="org-name">הארגון הארצי למניעת גניבות רכבים</div>
          <div class="org-id">מספר עמותה: 580772119 (ע"ר)</div>
        </div>
        
        <div class="report-header">
          <div class="date-line">תאריך כתיבת הדוח: ${reportTimestamp}</div>
          <div class="subject-line">הנדון: דוח פעולה</div>
        </div>
        
        <table class="info-table">
          <tr>
            <th>יחידה</th>
            <th>תעודת זהות</th>
            <th>שם מלא</th>
            <th>טלפון</th>
            <th>תפקיד</th>
          </tr>
          <tr>
            <td>יחידת אלג"ר</td>
            <td>${report.volunteer_id_number}</td>
            <td>${report.volunteer_full_name}</td>
            <td>${report.volunteer_phone}</td>
            <td>${report.volunteer_role}</td>
          </tr>
        </table>
        
        <div class="section">
          <div class="section-title">פרטי האירוע</div>
          <div class="field-row">
            <span class="field-label">תאריך ושעת האירוע:</span>
            <span class="field-value">${eventTimestamp}</span>
          </div>
          <div class="field-row">
            <span class="field-label">מקום האירוע:</span>
            <span class="field-value">${report.event_address}</span>
          </div>
        </div>
        
        ${report.has_partner ? `
        <div class="section">
          <div class="section-title">פרטי השותף</div>
          <div class="partner-section">
            <div class="field-row">
              <span class="field-label">שם השותף:</span>
              <span class="field-value">${report.partner_name || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">תעודת זהות:</span>
              <span class="field-value">${report.partner_id_number || ''}</span>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">תוכן הדוח</div>
          <div class="report-content">${report.full_report}</div>
        </div>
        
        <div class="signature-area">
          ${report.digital_signature ? `
          <div class="digital-signature">
            ✓ חתימה דיגיטלית - ${report.volunteer_full_name}<br>
            נחתם ב: ${new Date(report.signature_timestamp || report.created_at).toLocaleString('he-IL')}
          </div>
          ` : `
          <div style="margin-top: 40px;">
            <div>חתימת המדווח: ___________________</div>
            <div class="signature-line"></div>
          </div>
          `}
        </div>
      </body>
      </html>
    `;
  };
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .field {
          margin-bottom: 8px;
        }
        .field-label {
          font-weight: bold;
          display: inline-block;
          width: 120px;
        }
        .report-content {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          white-space: pre-wrap;
          margin-top: 10px;
        }
        .signature {
          margin-top: 30px;
          text-align: center;
          font-style: italic;
          color: #666;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>דוח פעולה</h1>
        <h2>מערכת אלג"ר - אגף התנדבות אזרחית</h2>
      </div>

      <div class="section">
        <div class="section-title">פרטי הדוח</div>
        <div class="field">
          <span class="field-label">תאריך כתיבה:</span>
          ${new Date(report.report_date).toLocaleDateString('he-IL')} ${report.report_time}
        </div>
        <div class="field">
          <span class="field-label">תאריך האירוע:</span>
          ${new Date(report.event_date).toLocaleDateString('he-IL')} ${report.event_time}
        </div>
        <div class="field">
          <span class="field-label">סטטוס:</span>
          ${report.status}
        </div>
      </div>

      <div class="section">
        <div class="section-title">פרטי המדווח</div>
        <div class="field">
          <span class="field-label">שם מלא:</span>
          ${report.volunteer_full_name}
        </div>
        <div class="field">
          <span class="field-label">תעודת זהות:</span>
          ${report.volunteer_id_number}
        </div>
        <div class="field">
          <span class="field-label">טלפון:</span>
          ${report.volunteer_phone}
        </div>
        <div class="field">
          <span class="field-label">תפקיד:</span>
          ${report.volunteer_role}
        </div>
      </div>

      <div class="section">
        <div class="section-title">מיקום האירוע</div>
        <div class="field">
          ${report.event_address}
        </div>
      </div>

      ${report.has_partner ? `
      <div class="section">
        <div class="section-title">פרטי השותף</div>
        <div class="field">
          <span class="field-label">שם השותף:</span>
          ${report.partner_name}
        </div>
        <div class="field">
          <span class="field-label">תעודת זהות:</span>
          ${report.partner_id_number}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">הדוח המלא</div>
        <div class="report-content">${report.full_report}</div>
      </div>

      ${report.review_notes ? `
      <div class="section">
        <div class="section-title">הערות מבקר</div>
        <div class="report-content">${report.review_notes}</div>
      </div>
      ` : ''}

      ${report.digital_signature ? `
      <div class="signature">
        <p>הדוח נחתם דיגיטלית ב-${new Date(report.signature_timestamp).toLocaleString('he-IL')}</p>
      </div>
      ` : ''}

      <div class="signature">
        <p>הודפס ב-${new Date().toLocaleString('he-IL')}</p>
      </div>
    </body>
    </html>
    `;
  };

  const generateTextContent = (report) => {
    return `דוח פעולה - מערכת אלג"ר
======================

פרטי הדוח:
----------
תאריך כתיבת הדוח: ${new Date(report.report_date).toLocaleDateString('he-IL')} ${report.report_time}
תאריך האירוע: ${new Date(report.event_date).toLocaleDateString('he-IL')} ${report.event_time}
סטטוס: ${report.status}

פרטי המדווח:
------------
שם מלא: ${report.volunteer_full_name}
תעודת זהות: ${report.volunteer_id_number}
טלפון: ${report.volunteer_phone}
תפקיד: ${report.volunteer_role}

מיקום האירוע:
-------------
${report.event_address}

${report.has_partner ? `פרטי השותף:
-----------
שם השותף: ${report.partner_name}
תעודת זהות השותף: ${report.partner_id_number}

` : ''}הדוח המלא:
----------
${report.full_report}

${report.review_notes ? `הערות מבקר:
-----------
${report.review_notes}

` : ''}${report.digital_signature ? `חתימה דיגיטלית: ${new Date(report.signature_timestamp).toLocaleString('he-IL')}
` : ''}
נוצר ב-${new Date().toLocaleString('he-IL')}
`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'טיוטה': return 'default';
      case 'הוגש': return 'info';
      case 'נבדק': return 'warning';
      case 'אושר': return 'success';
      case 'נדחה': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'אושר': return <ApprovedIcon />;
      case 'נדחה': return <RejectedIcon />;
      case 'הוגש': 
      case 'נבדק': return <PendingIcon />;
      default: return <EditIcon />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesStatus = !filterStatus || report.status === filterStatus;
    const matchesSearch = !searchTerm || 
      report.volunteer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.event?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.volunteer_full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Statistics
  const pendingReports = reports.filter(r => r.status === 'הוגש').length;
  const approvedReports = reports.filter(r => r.status === 'אושר').length;
  const rejectedReports = reports.filter(r => r.status === 'נדחה').length;
  const totalReports = reports.length;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <ReportIcon sx={{ mr: 2, fontSize: 40 }} />
        דוחות פעולה
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
            <CardContent>
              <Typography variant="h6" color="info.main">
                ממתינים לאישור
              </Typography>
              <Typography variant="h4">
                {pendingReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                אושרו
              </Typography>
              <Typography variant="h4">
                {approvedReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                נדחו
              </Typography>
              <Typography variant="h4">
                {rejectedReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                סה"כ דוחות
              </Typography>
              <Typography variant="h4">
                {totalReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="חיפוש לפי שם מתנדב או כותרת אירוע..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>סינון לפי סטטוס</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="סינון לפי סטטוס"
            >
              <MenuItem value="">הכל</MenuItem>
              <MenuItem value="טיוטה">טיוטה</MenuItem>
              <MenuItem value="הוגש">הוגש</MenuItem>
              <MenuItem value="נבדק">נבדק</MenuItem>
              <MenuItem value="אושר">אושר</MenuItem>
              <MenuItem value="נדחה">נדחה</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchReports}
              disabled={loading}
            >
              רענן
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Reports Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            רשימת דוחות ({filteredReports.length})
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>מתנדב</TableCell>
                    <TableCell>אירוע</TableCell>
                    <TableCell>תאריך הדוח</TableCell>
                    <TableCell>תאריך האירוע</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell align="center">פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {report.volunteer_full_name || report.volunteer?.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.volunteer_id_number && `ת.ז: ${report.volunteer_id_number}`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {report.event?.title || 'אירוע לא זמין'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <LocationIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            {report.event_address}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {new Date(report.report_date).toLocaleDateString('he-IL')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.report_time}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {new Date(report.event_date).toLocaleDateString('he-IL')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.event_time}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.status}
                          color={getStatusColor(report.status)}
                          size="small"
                          icon={getStatusIcon(report.status)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="צפייה">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedReport(report);
                                setOpenDialog(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="תצוגה מקדימה">
                            <IconButton
                              size="small"
                              onClick={() => handlePreviewReport(report)}
                            >
                              <PreviewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="הדפסה">
                            <IconButton
                              size="small"
                              onClick={() => handlePrintReport(report)}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="שמירה כקובץ">
                            <IconButton
                              size="small"
                              onClick={() => handleSaveAsReport(report)}
                            >
                              <SaveIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {isSuperRole && (
                            <Tooltip title="מחיקה">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteReport(report.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedReport && (
          <>
            <DialogTitle>
              פרטי דוח פעולה
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                {/* Report Header */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        פרטי הדוח
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            תאריך כתיבת הדוח:
                          </Typography>
                          <Typography variant="body1">
                            {new Date(selectedReport.report_date).toLocaleDateString('he-IL')} {selectedReport.report_time}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            תאריך האירוע:
                          </Typography>
                          <Typography variant="body1">
                            {new Date(selectedReport.event_date).toLocaleDateString('he-IL')} {selectedReport.event_time}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Personal Info */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        פרטי המדווח
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            שם מלא:
                          </Typography>
                          <Typography variant="body1">
                            {selectedReport.volunteer_full_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            תעודת זהות:
                          </Typography>
                          <Typography variant="body1">
                            {selectedReport.volunteer_id_number}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            טלפון:
                          </Typography>
                          <Typography variant="body1">
                            {selectedReport.volunteer_phone}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            תפקיד:
                          </Typography>
                          <Typography variant="body1">
                            {selectedReport.volunteer_role}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Event Location */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        מיקום האירוע
                      </Typography>
                      <Typography variant="body1">
                        {selectedReport.event_address}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Partner Info */}
                {selectedReport.has_partner && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          פרטי השותף
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              שם השותף:
                            </Typography>
                            <Typography variant="body1">
                              {selectedReport.partner_name}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              תעודת זהות השותף:
                            </Typography>
                            <Typography variant="body1">
                              {selectedReport.partner_id_number}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Full Report */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        הדוח המלא
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedReport.full_report}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Digital Signature */}
                {selectedReport.digital_signature && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      הדוח נחתם דיגיטלית ב-{new Date(selectedReport.signature_timestamp).toLocaleString('he-IL')}
                    </Alert>
                  </Grid>
                )}

                {/* Review Section */}
                {isSuperRole && selectedReport.status === 'הוגש' && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      אישור דוח
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="הערות לדוח (אופציונלי)"
                      placeholder="הוסף הערות לדוח..."
                      id="review-notes"
                    />
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
              {/* General Actions for All Users */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  startIcon={<PreviewIcon />}
                  onClick={() => handlePreviewReport(selectedReport)}
                >
                  תצוגה מקדימה
                </Button>
                <Button 
                  startIcon={<PrintIcon />}
                  onClick={() => handlePrintReport(selectedReport)}
                >
                  הדפסה
                </Button>
                <Button 
                  startIcon={<SaveIcon />}
                  onClick={() => handleSaveAsReport(selectedReport)}
                >
                  שמירה כקובץ
                </Button>
              </Box>

              {/* Admin Actions */}
              {isSuperRole && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteReport(selectedReport.id)}
                  >
                    מחק דוח
                  </Button>
                  
                  {selectedReport.status === 'הוגש' && (
                    <>
                      <Button
                        color="error"
                        onClick={() => {
                          const notes = document.getElementById('review-notes').value;
                          handleReviewReport(selectedReport.id, 'נדחה', notes);
                        }}
                      >
                        דחה
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => {
                          const notes = document.getElementById('review-notes').value;
                          handleReviewReport(selectedReport.id, 'אושר', notes);
                        }}
                      >
                        אשר
                      </Button>
                    </>
                  )}
                </Box>
              )}

              {/* Close Button */}
              <Button onClick={() => setOpenDialog(false)} sx={{ marginLeft: 'auto' }}>
                סגור
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ActionReports;
