import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress, Alert, Typography, Chip } from '@mui/material';
import API from '../services/api';
import toast from 'react-hot-toast';

const AdminResetPasswordDialog = ({ open, onClose, target }) => {
  // target = { id, name, type: 'user' | 'institute' }
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const endpoint = target.type === 'institute'
        ? `/admin/institutes/${target.id}/reset-password`
        : `/admin/users/${target.id}/reset-password`;
      await API.patch(endpoint, { newPassword });
      toast.success(`Password reset for ${target.name}`);
      setNewPassword('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset Password</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Resetting password for: <Chip label={target?.name} size="small" sx={{ ml: 1 }} />
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="New Password" type="password"
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          helperText="Minimum 6 characters" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={handleReset} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Reset Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminResetPasswordDialog;
