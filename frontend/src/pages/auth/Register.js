import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../../services/api';
import toast from 'react-hot-toast';
import {
  Box, Container, Paper, Typography, TextField, Button, CircularProgress
} from '@mui/material';
import { School } from '@mui/icons-material';

const Register = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    address: '', parent_phone: '', institute_code: ''
  });

  const isInstitute = role === 'institute';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isInstitute) {
        await API.post('/auth/register/institute', { name: form.name, email: form.email, password: form.password, phone: form.phone, address: form.address });
        toast.success('Institute registered! Please login.');
      } else {
        await API.post('/auth/register/user', { name: form.name, email: form.email, password: form.password, phone: form.phone, parent_phone: form.parent_phone, institute_code: form.institute_code, role });
        toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} registered! Please login.`);
      }
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = { institute: 'Institute Registration', student: 'Student Registration', teacher: 'Teacher Registration' };
  const roleColors = { institute: '#1976d2', student: '#388e3c', teacher: '#f57c00' };
  const color = roleColors[role] || '#1976d2';

  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(135deg, ${color} 0%, #90caf9 100%)`, display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <School sx={{ fontSize: 48, color }} />
            <Typography variant="h5" fontWeight={700}>EduLanka</Typography>
            <Typography variant="h6" color="text.secondary">{roleLabels[role]}</Typography>
          </Box>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Full Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Password" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Phone Number" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} sx={{ mb: 2 }} />

            {isInstitute && (
              <TextField fullWidth label="Address" multiline rows={2} value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} sx={{ mb: 2 }} />
            )}

            {!isInstitute && (
              <>
                <TextField fullWidth label="Institute Code" value={form.institute_code}
                  onChange={(e) => setForm({ ...form, institute_code: e.target.value })}
                  sx={{ mb: 2 }} required helperText="Get this code from your institute" />
                {role === 'student' && (
                  <TextField fullWidth label="Parent Phone Number" value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} sx={{ mb: 2 }} />
                )}
              </>
            )}

            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
              sx={{ py: 1.5, fontWeight: 700, bgcolor: color, '&:hover': { bgcolor: color, opacity: 0.9 } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
            </Button>
          </form>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              Already have an account? <Link to="/login" style={{ color }}>Login here</Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;
