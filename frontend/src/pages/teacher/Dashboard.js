import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { School, People, EventNote, Message } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/teacher/dashboard')
      .then((res) => setStats(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const cards = [
    { label: 'My Classes', value: stats?.total_classes, icon: <School />, color: '#1976d2' },
    { label: 'Total Students', value: stats?.total_students, icon: <People />, color: '#388e3c' },
    { label: "Today's Attendance", value: stats?.today_attendance, icon: <EventNote />, color: '#f57c00' },
    { label: 'Unread Messages', value: stats?.unread_messages, icon: <Message />, color: '#7b1fa2' },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Welcome, {user?.name}</Typography>
      <Grid container spacing={3}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Paper sx={{ p: 3, borderRadius: 2, borderLeft: `4px solid ${c.color}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: c.color }}>{c.value ?? '—'}</Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${c.color}15`, color: c.color }}>{c.icon}</Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
