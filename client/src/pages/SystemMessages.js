import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Message as MessageIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../config/supabase';

const SystemMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    recipients: [],
    sendToAll: false
  });

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('system_messages')
        .select(`
          *,
          sender:users!system_messages_sender_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('שגיאה בטעינת הודעות:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('is_active', true);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('שגיאה בטעינת משתמשים:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.title.trim() || !newMessage.content.trim()) {
      alert('יש למלא כותרת ותוכן הודעה');
      return;
    }

    if (!newMessage.sendToAll && newMessage.recipients.length === 0) {
      alert('יש לבחור נמענים או לסמן שליחה לכולם');
      return;
    }

    try {
      setLoading(true);
      
      const messageData = {
        title: newMessage.title,
        content: newMessage.content,
        sender_id: user.id,
        recipients: newMessage.sendToAll ? 'all' : newMessage.recipients,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_messages')
        .insert([messageData]);

      if (error) throw error;

      // Reset form
      setNewMessage({
        title: '',
        content: '',
        recipients: [],
        sendToAll: false
      });
      setOpen(false);
      fetchMessages();
      
      alert('הודעה נשלחה בהצלחה!');
    } catch (error) {
      console.error('שגיאה בשליחת הודעה:', error);
      alert('שגיאה בשליחת הודעה');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק הודעה זו?')) return;

    try {
      const { error } = await supabase
        .from('system_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      fetchMessages();
    } catch (error) {
      console.error('שגיאה במחיקת הודעה:', error);
      alert('שגיאה במחיקת הודעה');
    }
  };

  const handleRecipientChange = (userId) => {
    setNewMessage(prev => ({
      ...prev,
      recipients: prev.recipients.includes(userId)
        ? prev.recipients.filter(id => id !== userId)
        : [...prev.recipients, userId]
    }));
  };

  const getRecipientDisplay = (recipients) => {
    if (recipients === 'all') return 'כל המשתמשים';
    if (Array.isArray(recipients)) {
      const recipientNames = recipients.map(id => {
        const user = users.find(u => u.id === id);
        return user ? user.full_name : 'לא ידוע';
      });
      return recipientNames.join(', ');
    }
    return 'לא ידוע';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>טוען הודעות מערכת...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          הודעות מערכת
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ bgcolor: '#1976d2' }}
        >
          הודעה חדשה
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MessageIcon sx={{ mr: 2, color: '#1976d2' }} />
                <Box>
                  <Typography variant="h6">{messages.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    סך הודעות נשלחו
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PeopleIcon sx={{ mr: 2, color: '#4caf50' }} />
                <Box>
                  <Typography variant="h6">{users.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    משתמשים פעילים
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Messages Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>כותרת</TableCell>
              <TableCell>נמענים</TableCell>
              <TableCell>שולח</TableCell>
              <TableCell>תאריך שליחה</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary">
                    לא נמצאו הודעות
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{message.title}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {message.content.substring(0, 100)}
                      {message.content.length > 100 ? '...' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getRecipientDisplay(message.recipients)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{message.sender?.full_name || 'לא ידוע'}</TableCell>
                  <TableCell>
                    {new Date(message.created_at).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteMessage(message.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Message Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>הודעה חדשה</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="כותרת הודעה"
            value={newMessage.title}
            onChange={(e) => setNewMessage(prev => ({ ...prev, title: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="תוכן הודעה"
            value={newMessage.content}
            onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
            margin="normal"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={newMessage.sendToAll}
                onChange={(e) => setNewMessage(prev => ({ 
                  ...prev, 
                  sendToAll: e.target.checked,
                  recipients: e.target.checked ? [] : prev.recipients
                }))}
              />
            }
            label="שלח לכל המשתמשים"
            sx={{ mt: 2, mb: 2 }}
          />

          {!newMessage.sendToAll && (
            <Box>
              <Typography variant="h6" gutterBottom>בחר נמענים:</Typography>
              <Box maxHeight="200px" overflow="auto">
                {users.map((user) => (
                  <FormControlLabel
                    key={user.id}
                    control={
                      <Checkbox
                        checked={newMessage.recipients.includes(user.id)}
                        onChange={() => handleRecipientChange(user.id)}
                      />
                    }
                    label={`${user.full_name} (${user.role})`}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ביטול</Button>
          <Button
            onClick={handleSendMessage}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={loading}
          >
            שלח הודעה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemMessages;
