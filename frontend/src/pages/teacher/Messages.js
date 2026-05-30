import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  Divider, CircularProgress, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import toast from 'react-hot-toast';
import API from '../../services/api';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const ComposeDialog = ({ open, onClose, classes, onSent }) => {
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) { setClassId(''); setSubject(''); setBody(''); setErrors({}); }
  }, [open]);

  const handleSend = async () => {
    const e = {};
    if (!classId) e.classId = 'Select a class.';
    if (!subject.trim()) e.subject = 'Subject is required.';
    if (!body.trim()) e.body = 'Message is required.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    try {
      await API.post('/messages/send', {
        subject: subject.trim(),
        body: body.trim(),
        target_type: 'class',
        target_id: Number(classId),
      });
      toast.success('Message sent.');
      onSent();
      onClose();
    } catch {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Compose Message</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          select label="Class" value={classId}
          onChange={(e) => setClassId(e.target.value)}
          error={!!errors.classId} helperText={errors.classId} fullWidth required
        >
          {classes.map((c) => <TextField key={c.id} value={String(c.id)} label={c.name} />)}
          {classes.map((c) => (
            <Box key={c.id} component="option" value={String(c.id)}>{c.name}</Box>
          ))}
        </TextField>
        <TextField
          label="Subject" value={subject}
          onChange={(e) => setSubject(e.target.value)}
          error={!!errors.subject} helperText={errors.subject} fullWidth required
        />
        <TextField
          label="Message" value={body}
          onChange={(e) => setBody(e.target.value)}
          error={!!errors.body} helperText={errors.body}
          fullWidth required multiline rows={4}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={sending}>Cancel</Button>
        <Button variant="contained" onClick={handleSend} disabled={sending} startIcon={<Send />}>
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TeacherMessages = () => {
  const [messages, setMessages] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = () => {
    setLoading(true);
    API.get('/messages/sent')
      .then((res) => setMessages(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    API.get('/teacher/classes')
      .then((res) => setClasses(res.data.data || []))
      .catch(console.error);
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Messages</Typography>
        <Button variant="contained" startIcon={<Send />} onClick={() => setComposeOpen(true)}>
          Send Message
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : messages.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">No messages sent yet.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {messages.map((m, i) => (
              <Box key={m.id}>
                {i > 0 && <Divider />}
                <ListItem sx={{ px: 3, py: 2, alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{m.subject}</Typography>
                        <Chip label="Specific Class" size="small" variant="outlined" sx={{ fontSize: 11 }} />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {m.body}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {m.recipients_count} recipients · {m.read_count} read · {fmtDate(m.sent_at)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>

      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        classes={classes}
        onSent={load}
      />
    </Box>
  );
};

export default TeacherMessages;
