import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemText, Divider,
  Collapse, IconButton, Tooltip,
} from '@mui/material';
import {
  Send, Message as MessageIcon, ExpandMore, ExpandLess,
  MarkEmailRead, DraftsOutlined,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import API from '../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// ── Compose Dialog ────────────────────────────────────────────────────────────

const ComposeDialog = ({ open, onClose, classData, onSent }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors]   = useState({});

  useEffect(() => {
    if (open) { setSubject(''); setBody(''); setErrors({}); }
  }, [open]);

  const validate = () => {
    const e = {};
    if (!subject.trim()) e.subject = 'Subject is required.';
    if (!body.trim())    e.body    = 'Message body is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      const res = await API.post('/messages/send', {
        subject: subject.trim(),
        body: body.trim(),
        target_type: 'class',
        target_id: classData.id,
      });
      const count = res.data.data?.recipients_count ?? 0;
      toast.success(`Message sent to ${count} student${count !== 1 ? 's' : ''}.`);
      onSent();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Compose Message
        <Typography variant="body2" color="text.secondary" fontWeight={400}>
          To: All students in <strong>{classData?.name}</strong>
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {/* Recipient badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
          <MarkEmailRead sx={{ color: '#2e7d32', fontSize: 20 }} />
          <Typography variant="body2" color="success.dark">
            This message will be delivered to all enrolled students in <strong>{classData?.name}</strong>.
          </Typography>
        </Box>

        <TextField
          label="Subject"
          value={subject}
          onChange={(e) => { setSubject(e.target.value); if (errors.subject) setErrors((p) => ({ ...p, subject: undefined })); }}
          error={!!errors.subject}
          helperText={errors.subject}
          fullWidth
          required
        />

        <TextField
          label="Message"
          value={body}
          onChange={(e) => { setBody(e.target.value); if (errors.body) setErrors((p) => ({ ...p, body: undefined })); }}
          error={!!errors.body}
          helperText={errors.body}
          fullWidth
          required
          multiline
          rows={5}
          placeholder="Type your message here…"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={sending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending}
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send />}
        >
          {sending ? 'Sending…' : 'Send Message'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Message Row ───────────────────────────────────────────────────────────────

const MessageRow = ({ msg, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const readCount = Number(msg.read_count ?? 0);
  const total     = Number(msg.recipient_count ?? 0);

  return (
    <>
      <ListItem
        alignItems="flex-start"
        sx={{ py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#fafafa' } }}
        onClick={() => setExpanded((v) => !v)}
        secondaryAction={
          <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
            <IconButton size="small" edge="end">
              {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Tooltip>
        }
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 3 }}>
              <Typography variant="body2" fontWeight={600}>{msg.subject}</Typography>
              <Chip
                label={`${readCount} / ${total} read`}
                size="small"
                color={readCount === total && total > 0 ? 'success' : 'default'}
                variant="outlined"
                sx={{ height: 18, fontSize: 10 }}
              />
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              {fmtDate(msg.created_at)}
            </Typography>
          }
        />
      </ListItem>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2, bgcolor: '#f9f9f9' }}>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', p: 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}
          >
            {msg.body}
          </Typography>
        </Box>
      </Collapse>

      {!isLast && <Divider component="li" />}
    </>
  );
};

// ── Messages Dialog ───────────────────────────────────────────────────────────

const MessagesDialog = ({ open, onClose, classData }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [compose, setCompose]   = useState(false);

  const load = useCallback(() => {
    if (!classData) return;
    setLoading(true);
    API.get(`/messages/class/${classData.id}`)
      .then((res) => setMessages(res.data.data))
      .catch(() => toast.error('Failed to load messages.'))
      .finally(() => setLoading(false));
  }, [classData]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const unread   = messages.reduce((s, m) => s + (Number(m.recipient_count) - Number(m.read_count ?? 0)), 0);
  const totalSent = messages.length;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              Messages
              <Typography variant="body2" color="text.secondary" fontWeight={400}>
                {classData?.name}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<Send />}
              onClick={() => setCompose(true)}
              sx={{ mt: 0.5 }}
            >
              Compose
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 2, pt: '4px !important' }}>
          {/* Stats bar */}
          {!loading && totalSent > 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`${totalSent} sent`} size="small" variant="outlined" icon={<Send sx={{ fontSize: '14px !important' }} />} />
              {unread > 0 && (
                <Chip label={`${unread} unread`} size="small" color="warning" variant="outlined" />
              )}
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <DraftsOutlined sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" gutterBottom>
                No messages sent to this class yet.
              </Typography>
              <Button variant="outlined" startIcon={<Send />} onClick={() => setCompose(true)} sx={{ mt: 1 }}>
                Send First Message
              </Button>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <List disablePadding>
                {messages.map((msg, idx) => (
                  <MessageRow key={msg.id} msg={msg} isLast={idx === messages.length - 1} />
                ))}
              </List>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      <ComposeDialog
        open={compose}
        onClose={() => setCompose(false)}
        classData={classData}
        onSent={load}
      />
    </>
  );
};

export { MessagesDialog };
