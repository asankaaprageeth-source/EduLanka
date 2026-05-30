import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Box, Container, Paper, Typography, TextField,
  Button, CircularProgress, Alert, InputAdornment, IconButton,
} from '@mui/material';
import { School, Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import API from '../../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [tokenState, setTokenState] = useState('checking'); // checking | valid | invalid
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ new: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setTokenState('invalid'); return; }
    API.get(`/auth/verify-token/${token}`)
      .then((res) => setTokenState(res.data.valid ? 'valid' : 'invalid'))
      .catch(() => setTokenState('invalid'));
  }, [token]);

  const validate = () => {
    const errs = {};
    if (form.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Please try again.');
      if (err.response?.status === 400) setTokenState('invalid');
    } finally {
      setLoading(false);
    }
  };

  const strength = (pw) => {
    if (!pw) return { label: '', color: '#ccc', width: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: '', color: '#ccc', width: 0 },
      { label: 'Weak', color: '#f44336', width: 20 },
      { label: 'Fair', color: '#ff9800', width: 40 },
      { label: 'Good', color: '#ffeb3b', width: 60 },
      { label: 'Strong', color: '#4caf50', width: 80 },
      { label: 'Very Strong', color: '#2e7d32', width: 100 },
    ];
    return levels[score];
  };

  const pwStrength = strength(form.newPassword);

  if (tokenState === 'checking') {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#fff' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <School sx={{ fontSize: 48, color: '#1976d2' }} />
            <Typography variant="h5" fontWeight={700}>EduLanka</Typography>
            <Typography variant="body2" color="text.secondary">
              {tokenState === 'invalid' ? 'Invalid Reset Link' : 'Set New Password'}
            </Typography>
          </Box>

          {tokenState === 'invalid' && (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                This reset link is invalid or has expired.
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Link expire වී ඇත. නැවත forgot password request කරන්න.
              </Typography>
              <Button variant="contained" fullWidth component={Link} to="/forgot-password" sx={{ mb: 1 }}>
                Request New Reset Link
              </Button>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>← Back to Login</Link>
              </Typography>
            </Box>
          )}

          {tokenState === 'valid' && !success && (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="New Password"
                type={showPw.new ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => {
                  setForm((p) => ({ ...p, newPassword: e.target.value }));
                  if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: undefined }));
                }}
                error={!!errors.newPassword}
                helperText={errors.newPassword}
                sx={{ mb: 1 }}
                required
                autoFocus
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}>
                        {showPw.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {form.newPassword && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ height: 4, borderRadius: 2, bgcolor: '#eee', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${pwStrength.width}%`, bgcolor: pwStrength.color, transition: 'width 0.3s' }} />
                  </Box>
                  {pwStrength.label && (
                    <Typography variant="caption" sx={{ color: pwStrength.color }}>{pwStrength.label}</Typography>
                  )}
                </Box>
              )}

              <TextField
                fullWidth
                label="Confirm Password"
                type={showPw.confirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm((p) => ({ ...p, confirmPassword: e.target.value }));
                  if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                sx={{ mb: 3 }}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}>
                        {showPw.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5, fontWeight: 700, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link to="/login" style={{ color: '#1976d2', fontSize: '13px', textDecoration: 'none' }}>← Back to Login</Link>
              </Box>
            </form>
          )}

          {success && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 56, color: '#2e7d32', mb: 1 }} />
              <Alert severity="success" sx={{ mb: 2 }}>Password successfully reset!</Alert>
              <Typography variant="body2" color="text.secondary">
                ක්ෂණිකව login page වෙත redirect කරනු ලැබේ...
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;
