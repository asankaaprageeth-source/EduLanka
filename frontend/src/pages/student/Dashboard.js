import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { School, EventNote, AttachMoney, Message } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import QRCode from 'qrcode.react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/student/dashboard')
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Welcome, {user?.name}</Typography>
        <Typography variant="body2" color="text.secondary">Student ID: {user?.student_id}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>My QR Code</Typography>
            <QRCode value={JSON.stringify({ userId: user?.id, student_id: user?.student_id })} size={160} />
            <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
              Show this to mark attendance
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
                <School sx={{ color: '#1976d2', mb: 1 }} />
                <Typography variant="h5" fontWeight={700}>{stats?.total_classes}</Typography>
                <Typography variant="body2" color="text.secondary">Enrolled Classes</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #388e3c' }}>
                <EventNote sx={{ color: '#388e3c', mb: 1 }} />
                <Typography variant="h5" fontWeight={700}>{stats?.this_month_attendance}</Typography>
                <Typography variant="body2" color="text.secondary">Present this month</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #d32f2f' }}>
                <AttachMoney sx={{ color: '#d32f2f', mb: 1 }} />
                <Typography variant="h5" fontWeight={700} color="error.main">
                  Rs. {Number(stats?.pending_fees_amount || 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">Pending Fees</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #f57c00' }}>
                <Message sx={{ color: '#f57c00', mb: 1 }} />
                <Typography variant="h5" fontWeight={700}>{stats?.unread_messages}</Typography>
                <Typography variant="body2" color="text.secondary">Unread Messages</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
