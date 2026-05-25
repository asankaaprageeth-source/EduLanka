import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip, CircularProgress } from '@mui/material';
import API from '../../services/api';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/messages/inbox').then((res) => setMessages(res.data.data)).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await API.put(`/messages/${id}/read`);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_read: 1 } : m));
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Inbox</Typography>
      <Paper sx={{ borderRadius: 2 }}>
        {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box> : (
          <List>
            {messages.length === 0 && <ListItem><ListItemText primary="No messages yet." /></ListItem>}
            {messages.map((m, i) => (
              <React.Fragment key={m.id}>
                {i > 0 && <Divider />}
                <ListItem
                  onClick={() => !m.is_read && markRead(m.id)}
                  sx={{ bgcolor: m.is_read ? 'inherit' : '#e3f2fd', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                >
                  <ListItemText
                    primary={<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography fontWeight={m.is_read ? 400 : 700}>{m.subject}</Typography>
                      {!m.is_read && <Chip label="New" size="small" color="primary" />}
                    </Box>}
                    secondary={<>
                      <Typography variant="body2">{m.body}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        From: {m.sender_name} · {new Date(m.created_at).toLocaleString()}
                      </Typography>
                    </>}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default Messages;
