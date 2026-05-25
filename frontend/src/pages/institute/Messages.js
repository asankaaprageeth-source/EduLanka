import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  List, ListItem, ListItemText, Divider, Chip, Grid
} from '@mui/material';
import { Send } from '@mui/icons-material';
import API from '../../services/api';
import toast from 'react-hot-toast';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [classes, setClasses] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', target_type: 'all', target_id: '' });

  useEffect(() => {
    API.get('/messages/sent').then((res) => setMessages(res.data.data));
    API.get('/institute/classes').then((res) => setClasses(res.data.data));
  }, []);

  const handleSend = async () => {
    try {
      await API.post('/messages/send', form);
      toast.success('Message sent!');
      setOpen(false);
      const res = await API.get('/messages/sent');
      setMessages(res.data.data);
      setForm({ subject: '', body: '', target_type: 'all', target_id: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    }
  };

  const targetLabels = { all: 'All Students', teachers: 'All Teachers', class: 'Specific Class', individual: 'Individual' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Messages</Typography>
        <Button variant="contained" startIcon={<Send />} onClick={() => setOpen(true)}>Send Message</Button>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        <List>
          {messages.length === 0 && (
            <ListItem><ListItemText primary="No messages sent yet." /></ListItem>
          )}
          {messages.map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <Divider />}
              <ListItem>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography fontWeight={600}>{m.subject}</Typography>
                    <Chip label={targetLabels[m.target_type]} size="small" variant="outlined" />
                  </Box>}
                  secondary={<>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{m.body}</Typography>
                    <Typography variant="caption">{m.recipient_count} recipients · {m.read_count} read · {new Date(m.created_at).toLocaleString()}</Typography>
                  </>}
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Message</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Send To</InputLabel>
                <Select value={form.target_type} label="Send To"
                  onChange={(e) => setForm({ ...form, target_type: e.target.value, target_id: '' })}>
                  <MenuItem value="all">All Students</MenuItem>
                  <MenuItem value="teachers">All Teachers</MenuItem>
                  <MenuItem value="class">Specific Class</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {form.target_type === 'class' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Class</InputLabel>
                  <Select value={form.target_id} label="Class"
                    onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
                    {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Subject" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Message" multiline rows={4} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSend} variant="contained" startIcon={<Send />}>Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Messages;
