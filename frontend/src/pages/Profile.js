import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Divider,
  CircularProgress, Chip, Autocomplete, MenuItem,
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import ProfilePicUpload from '../components/ProfilePicUpload';
import API from '../services/api';
import toast from 'react-hot-toast';

const SL_DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle',
  'Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle',
  'Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala',
  'Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura',
  'Trincomalee','Vavuniya',
];

const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','Combined Mathematics',
  'ICT','Economics','Accounting','Business Studies','History',
  'Geography','Political Science','Logic','English','Sinhala','Tamil',
  'Art','Music','Dancing','Drama','Physical Education','Agriculture',
  'Engineering Technology','Bio Systems Technology',
];

const parseSubjects = (raw) => {
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const role = user?.role;

  // ── Info form ────────────────────────────────────────────────────────────
  const [info, setInfo] = useState({
    name: '', email: '', phone: '', parent_phone: '',
    district: '', city: '', village: '', subjects: [],
  });
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);

  // ── Password form ────────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  // Load current profile from backend
  useEffect(() => {
    API.get('/auth/profile')
      .then((res) => {
        const d = res.data.data;
        setInfo({
          name:         d.name         || '',
          email:        d.email        || '',
          phone:        d.phone        || '',
          parent_phone: d.parent_phone || '',
          district:     d.district     || '',
          city:         d.city         || '',
          village:      d.village      || '',
          subjects:     parseSubjects(d.subjects),
        });
      })
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setInfoLoading(false));
  }, []);

  const handleInfo = (field) => (e) => setInfo((p) => ({ ...p, [field]: e.target.value }));

  const handleSaveInfo = async () => {
    if (!info.name.trim()) { toast.error('Name is required.'); return; }
    setInfoSaving(true);
    try {
      const res = await API.put('/auth/profile', {
        name:         info.name,
        email:        info.email,
        phone:        info.phone,
        parent_phone: info.parent_phone,
        district:     info.district,
        city:         info.city,
        village:      info.village,
        subjects:     info.subjects,
      });
      updateUser({ name: res.data.data.name, email: res.data.data.email });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setInfoSaving(false);
    }
  };

  const validatePw = () => {
    const errs = {};
    if (!pw.current_password) errs.current_password = 'Required.';
    if (!pw.new_password) errs.new_password = 'Required.';
    else if (pw.new_password.length < 8) errs.new_password = 'At least 8 characters.';
    if (pw.new_password !== pw.confirm_password) errs.confirm_password = 'Passwords do not match.';
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePw = async () => {
    if (!validatePw()) return;
    setPwSaving(true);
    try {
      await API.put('/auth/change-password', {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      toast.success('Password changed!');
      setPw({ current_password: '', new_password: '', confirm_password: '' });
      setPwErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  if (infoLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>My Profile</Typography>

      {/* ── Profile picture + personal info ─────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Personal Information</Typography>

        <Grid container spacing={3}>
          {/* Avatar column */}
          <Grid item xs={12} sm="auto">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 140 }}>
              <ProfilePicUpload role={role} />
            </Box>
          </Grid>

          {/* Fields column */}
          <Grid item xs={12} sm>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Full Name"
                  value={info.name}
                  onChange={handleInfo('name')}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={info.email}
                  onChange={handleInfo('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  value={info.phone}
                  onChange={handleInfo('phone')}
                  fullWidth
                />
              </Grid>

              {/* Student-only */}
              {role === 'student' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Parent / Guardian Phone"
                    value={info.parent_phone}
                    onChange={handleInfo('parent_phone')}
                    fullWidth
                  />
                </Grid>
              )}

              {/* Teacher + Student location */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="District"
                  value={info.district}
                  onChange={handleInfo('district')}
                  fullWidth
                >
                  <MenuItem value=""><em>— Select —</em></MenuItem>
                  {SL_DISTRICTS.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City / Town"
                  value={info.city}
                  onChange={handleInfo('city')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Village"
                  value={info.village}
                  onChange={handleInfo('village')}
                  fullWidth
                />
              </Grid>

              {/* Teacher-only subjects */}
              {role === 'teacher' && (
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={SUBJECT_OPTIONS}
                    value={info.subjects}
                    onChange={(_, val) => setInfo((p) => ({ ...p, subjects: val }))}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Subjects Taught" placeholder="Add subject…" />
                    )}
                  />
                </Grid>
              )}
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={infoSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={handleSaveInfo}
                disabled={infoSaving}
              >
                {infoSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Change password ──────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Lock sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" fontWeight={600}>Change Password</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Current Password"
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))}
              error={!!pwErrors.current_password}
              helperText={pwErrors.current_password}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="New Password"
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
              error={!!pwErrors.new_password}
              helperText={pwErrors.new_password}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Confirm New Password"
              type="password"
              value={pw.confirm_password}
              onChange={(e) => setPw((p) => ({ ...p, confirm_password: e.target.value }))}
              error={!!pwErrors.confirm_password}
              helperText={pwErrors.confirm_password}
              fullWidth
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={pwSaving ? <CircularProgress size={16} color="inherit" /> : <Lock />}
            onClick={handleChangePw}
            disabled={pwSaving}
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile;
