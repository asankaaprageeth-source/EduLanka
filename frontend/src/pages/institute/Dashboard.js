import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { People, School, EventNote, AttachMoney, Warning, PersonAdd } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const StatCard = ({ title, value, icon, color, sub }) => (
  <Paper sx={{ p: 3, borderRadius: 2, borderLeft: `4px solid ${color}` }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>{value ?? '—'}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color }}>{icon}</Box>
    </Box>
  </Paper>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/institute/dashboard')
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Welcome, {user?.name}</Typography>
        <Typography variant="body2" color="text.secondary">Institute Code: <strong>{user?.institute_code}</strong></Typography>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Students" value={stats?.total_students} icon={<People />} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Teachers" value={stats?.total_teachers} icon={<PersonAdd />} color="#f57c00" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Classes" value={stats?.total_classes} icon={<School />} color="#7b1fa2" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Today's Attendance" value={stats?.today_attendance} icon={<EventNote />} color="#388e3c" sub="Present today" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Monthly Income" value={`Rs. ${Number(stats?.monthly_income || 0).toLocaleString()}`} icon={<AttachMoney />} color="#0288d1" sub="This month" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Pending Fees" value={stats?.pending_fees} icon={<Warning />} color="#d32f2f" sub="Unpaid records" />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
