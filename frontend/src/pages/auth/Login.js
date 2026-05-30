import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Box, Container, Paper, Typography, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';
import { School } from '@mui/icons-material';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'institute' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password, form.role);
      toast.success(`Welcome, ${user.name}!`);
      if (user.role === 'institute') navigate('/institute/dashboard');
      else if (user.role === 'teacher') navigate('/teacher/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <School sx={{ fontSize: 48, color: '#1976d2' }} />
            <Typography variant="h5" fontWeight={700}>EduLanka</Typography>
            <Typography variant="body2" color="text.secondary">Sign in to your account</Typography>
          </Box>
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Login As</InputLabel>
              <Select value={form.role} label="Login As" onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <MenuItem value="institute">Institute</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              sx={{ mb: 2 }} required />
            <TextField fullWidth label="Password" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              sx={{ mb: 1 }} required />
            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Link to="/forgot-password" style={{ color: '#1976d2', fontSize: '13px', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </Box>
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
              sx={{ py: 1.5, fontWeight: 700 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
            </Button>
          </form>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              Don't have an account? <Link to="/" style={{ color: '#1976d2' }}>Register here</Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
