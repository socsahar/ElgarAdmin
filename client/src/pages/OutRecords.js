import React, { useState } from 'react';
import {
  Box,
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
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import UserAvatar from '../components/UserAvatar';
import {
  ExitToApp,
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  Event as EventIcon,
  Visibility,
  Download,
  Filter,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import LoadingSpinner from '../components/LoadingSpinner';

const OutRecords = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    approved: '',
    eventId: ''
  });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['outRecords', page, filters],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
        ...(filters.approved && { approved: filters.approved }),
        ...(filters.eventId && { eventId: filters.eventId })
      });
      
      const response = await axios.get(`/attendance/out-records?${params}`);
      return response.data.data;
    },
    {
      refetchInterval: 30000
    }
  );

  const approveMutation = useMutation(
    ({ attendanceId, status }) => 
      axios.patch(`/attendance/${attendanceId}/approve`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('outRecords');
        enqueueSnackbar('סטטוס עודכן בהצלחה', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.message || 'שגיאה בעדכון הסטטוס', { variant: 'error' });
      }
    }
  );

  const handleApprove = async (attendanceId, status) => {
    await approveMutation.mutateAsync({ attendanceId, status });
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'מאושר';
      case 'rejected': return 'נדחה';
      default: return 'ממתין';
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const { outRecords, stats, pagination } = data || {};

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={he}>
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          רשומות יוצא
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {stats?.map((stat) => (
            <Grid item xs={12} sm={4} key={stat._id || 'pending'}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: getStatusColor(stat._id || 'pending') + '.main',
                      mx: 'auto',
                      mb: 1
                    }}
                  >
                    {stat._id === 'approved' ? <CheckCircle /> :
                     stat._id === 'rejected' ? <Cancel /> : <Schedule />}
                  </Avatar>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getStatusText(stat._id || 'pending')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Filter sx={{ mr: 1, verticalAlign: 'middle' }} />
              סינון
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="מתאריך"
                  value={filters.startDate}
                  onChange={(date) => setFilters({ ...filters, startDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="עד תאריך"
                  value={filters.endDate}
                  onChange={(date) => setFilters({ ...filters, endDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>סטטוס אישור</InputLabel>
                  <Select
                    value={filters.approved}
                    onChange={(e) => setFilters({ ...filters, approved: e.target.value })}
                  >
                    <MenuItem value="">הכל</MenuItem>
                    <MenuItem value="true">מאושר</MenuItem>
                    <MenuItem value="false">נדחה</MenuItem>
                    <MenuItem value="pending">ממתין</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setFilters({ startDate: null, endDate: null, approved: '', eventId: '' })}
                >
                  נקה סינון
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                רשימת רשומות יוצא ({pagination?.total || 0})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => {
                  // Handle export
                  const params = new URLSearchParams({
                    type: 'attendance',
                    ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
                    ...(filters.endDate && { endDate: filters.endDate.toISOString() })
                  });
                  window.open(`${axios.defaults.baseURL}/analytics/export?${params}`, '_blank');
                }}
              >
                ייצא נתונים
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>משתמש</TableCell>
                    <TableCell>אירוע</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>סומן על ידי</TableCell>
                    <TableCell>סיבה</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outRecords?.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <UserAvatar 
                            user={record.user}
                            size={32}
                            roleColor="primary"
                          />
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {record.user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.user.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EventIcon sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            {record.event.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(record.markedOutBy.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.markedOutBy.user?.name || 'לא ידוע'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {record.markedOutBy.reason || 'לא צוין'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(record.approvedBy?.status || 'pending')}
                          color={getStatusColor(record.approvedBy?.status || 'pending')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="הצג פרטים">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(record)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {(!record.approvedBy?.status || record.approvedBy.status === 'pending') && (
                            <>
                              <Tooltip title="אשר">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApprove(record._id, 'approved')}
                                  disabled={approveMutation.isLoading}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="דחה">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleApprove(record._id, 'rejected')}
                                  disabled={approveMutation.isLoading}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={pagination.pages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>פרטי רשומת יוצא</DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>משתמש</Typography>
                  <Typography variant="body1">{selectedRecord.user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedRecord.user.username}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>אירוע</Typography>
                  <Typography variant="body1">{selectedRecord.event.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedRecord.event.type}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>זמן כניסה</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedRecord.checkInTime), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>זמן סימון כיוצא</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedRecord.markedOutBy.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>סומן על ידי</Typography>
                  <Typography variant="body1">{selectedRecord.markedOutBy.user?.name || 'לא ידוע'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>סטטוס אישור</Typography>
                  <Chip
                    label={getStatusText(selectedRecord.approvedBy?.status || 'pending')}
                    color={getStatusColor(selectedRecord.approvedBy?.status || 'pending')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>סיבה</Typography>
                  <Typography variant="body1">
                    {selectedRecord.markedOutBy.reason || 'לא צוינה סיבה'}
                  </Typography>
                </Grid>
                {selectedRecord.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>הערות</Typography>
                    <Typography variant="body1">{selectedRecord.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>סגור</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default OutRecords;
