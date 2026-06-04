import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, InputAdornment, Tabs, Tab, IconButton,
  Tooltip, Avatar,
} from '@mui/material';
import {
  Business, People, School, MenuBook, Search,
  CheckCircle, Cancel, LockReset,
} from '@mui/icons-material';
import API from '../../services/api';
import toast from 'react-hot-toast';
import AdminResetPasswordDialog from '../../components/AdminResetPasswordDialog';

const StatCard = ({ icon, label, value, color }) => (
  <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ bgcolor: `${color}20`, p: 1.5, borderRadius: 2 }}>
        {React.cloneElement(icon, { sx: { fontSize: 32, color } })}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight={700}>{value ?? '—'}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats]           = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [users, setUsers]           = useState([]);
  const [tab, setTab]               = useState(0);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [resetDialog, setResetDialog] = useState({ open: false, target: null });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, i, u] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/institutes'),
        API.get('/admin/users'),
      ]);
      setStats(s.data.data);
      setInstitutes(i.data.data);
      setUsers(u.data.data);
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const toggleInstitute = async (id) => {
    try {
      const res = await API.patch(`/admin/institutes/${id}/toggle`);
      toast.success(res.data.message);
      setInstitutes(prev => prev.map(i => i.id === id ? { ...i, is_active: !i.is_active } : i));
    } catch { toast.error('Failed.'); }
  };

  const toggleUser = async (id) => {
    try {
      const res = await API.patch(`/admin/users/${id}/toggle`);
      toast.success(res.data.message);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
    } catch { toast.error('Failed.'); }
  };

  const openReset = (id, name, type) => setResetDialog({ open: true, target: { id, name, type } });

  const fi = institutes.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.email?.toLowerCase().includes(search.toLowerCase()) ||
    i.institute_code?.toLowerCase().includes(search.toLowerCase())
  );
  const fu = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.institute?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress size={48} /></Box>;

  const ActionButtons = ({ isActive, onToggle, onReset }) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Tooltip title={isActive ? 'Deactivate' : 'Activate'}>
        <IconButton size="small" onClick={onToggle}>
          {isActive ? <Cancel color="error" fontSize="small" /> : <CheckCircle color="success" fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Reset Password">
        <IconButton size="small" onClick={onReset}>
          <LockReset color="warning" fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const UserTable = ({ roleFilter }) => {
    const list = fu.filter(u => u.role === roleFilter);
    const isStudent = roleFilter === 'student';
    return (
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>#</b></TableCell>
              <TableCell><b>Name</b></TableCell>
              <TableCell><b>Email</b></TableCell>
              <TableCell><b>Phone</b></TableCell>
              {isStudent ? <TableCell><b>Student ID</b></TableCell> : <TableCell><b>District</b></TableCell>}
              <TableCell><b>Institute</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Registered</b></TableCell>
              <TableCell><b>Actions</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((u, idx) => (
              <TableRow key={u.id} hover>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: isStudent ? '#388e3c20' : '#f57c0020', color: isStudent ? '#388e3c' : '#f57c00', fontSize: 12 }}>
                      {u.name?.charAt(0)}
                    </Avatar>
                    {u.name}
                  </Box>
                </TableCell>
                <TableCell>{u.email || '—'}</TableCell>
                <TableCell>{u.phone || '—'}</TableCell>
                {isStudent ? <TableCell><Chip label={u.student_id} size="small" variant="outlined" /></TableCell> : <TableCell>{u.district || '—'}</TableCell>}
                <TableCell>{u.institute?.name || '—'}</TableCell>
                <TableCell><Chip label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} size="small" /></TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <ActionButtons
                    isActive={u.is_active}
                    onToggle={() => toggleUser(u.id)}
                    onReset={() => openReset(u.id, u.name, 'user')}
                  />
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={9} align="center">No {roleFilter}s found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>🛡️ Administrator Dashboard</Typography>

      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<Business />} label="Total Institutes" value={stats?.totalInstitutes} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<People />} label="Total Students" value={stats?.totalStudents} color="#388e3c" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<School />} label="Total Teachers" value={stats?.totalTeachers} color="#f57c00" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<MenuBook />} label="Total Classes" value={stats?.totalClasses} color="#7b1fa2" /></Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 240 }} />
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }}>
          <Tab label={`Institutes (${institutes.length})`} />
          <Tab label={`Students (${users.filter(u => u.role === 'student').length})`} />
          <Tab label={`Teachers (${users.filter(u => u.role === 'teacher').length})`} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><b>#</b></TableCell>
                <TableCell><b>Institute</b></TableCell>
                <TableCell><b>Email</b></TableCell>
                <TableCell><b>Code</b></TableCell>
                <TableCell><b>Users</b></TableCell>
                <TableCell><b>Classes</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Registered</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fi.map((inst, idx) => (
                <TableRow key={inst.id} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d220', color: '#1976d2', fontSize: 12 }}>{inst.name?.charAt(0)}</Avatar>
                      {inst.name}
                    </Box>
                  </TableCell>
                  <TableCell>{inst.email}</TableCell>
                  <TableCell><Chip label={inst.institute_code} size="small" variant="outlined" /></TableCell>
                  <TableCell>{inst._count?.users ?? 0}</TableCell>
                  <TableCell>{inst._count?.classes ?? 0}</TableCell>
                  <TableCell><Chip label={inst.is_active ? 'Active' : 'Inactive'} color={inst.is_active ? 'success' : 'default'} size="small" /></TableCell>
                  <TableCell>{new Date(inst.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <ActionButtons
                      isActive={inst.is_active}
                      onToggle={() => toggleInstitute(inst.id)}
                      onReset={() => openReset(inst.id, inst.name, 'institute')}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {fi.length === 0 && <TableRow><TableCell colSpan={9} align="center">No institutes found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && <UserTable roleFilter="student" />}
      {tab === 2 && <UserTable roleFilter="teacher" />}

      <AdminResetPasswordDialog
        open={resetDialog.open}
        onClose={() => setResetDialog({ open: false, target: null })}
        target={resetDialog.target}
      />
    </Box>
  );
};

export default AdminDashboard;
