import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress, IconButton, InputAdornment, Alert } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import API from '../services/api';
import toast from 'react-hot-toast';

const ChangePasswordDialog = ({ open, onClose }) => {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (form.new_password !== form.confirm_password) { setError('New passwords do not match.'); return; }
    if (form.new_password.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await API.put('/auth/change-password', { current_password: form.current_password, new_password: form.new_password });
      toast.success('Password changed successfully!');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally { setLoading(false); }
  };

  const field = (label, key, showKey) => (
    <TextField fullWidth label={label} type={show[showKey] ? 'text' : 'password'}
      value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
      sx={{ mb: 2 }}
      InputProps={{ endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={() => setShow({ ...show, [showKey]: !show[showKey] })}>
            {show[showKey] ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      )}}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {field('Current Password', 'current_password', 'current')}
        {field('New Password', 'new_password', 'new')}
        {field('Confirm New Password', 'confirm_password', 'confirm')}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Change Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
