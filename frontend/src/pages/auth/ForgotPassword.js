import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Box, Container, Paper, Typography, TextField,
  Button, CircularProgress, Alert,
} from '@mui/material';
import { School, MarkEmailRead } from '@mui/icons-material';
import API from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
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
            <Typography variant="body2" color="text.secondary">Reset your password</Typography>
          </Box>

          {sent ? (
            <Box sx={{ textAlign: 'center' }}>
              <MarkEmailRead sx={{ fontSize: 56, color: '#2e7d32', mb: 1 }} />
              <Alert severity="success" sx={{ mb: 2, textAlign: 'left' }}>
                Reset link sent! Your email inbox check කරන්න.
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                <strong>{email}</strong> වෙත reset link send කරන ලදී. Link <strong>1 hour</strong> valid වේ.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Email නොලැබුණේ නම් Spam folder check කරන්න.
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => { setSent(false); setEmail(''); }}
                sx={{ mb: 1 }}
              >
                Try a different email
              </Button>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>← Back to Login</Link>
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                ඔබගේ registered email address ඇතුළු කරන්න. Password reset link send කරනු ලැබේ.
              </Typography>
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 3 }}
                  required
                  autoFocus
                />
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !email.trim()}
                  sx={{ py: 1.5, fontWeight: 700, mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
                </Button>
              </form>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>← Back to Login</Link>
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
