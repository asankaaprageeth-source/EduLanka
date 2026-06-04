import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Grid, Divider,
  FormControl, InputLabel, Select, MenuItem, Checkbox,
  List, ListItem, ListItemText, Alert, CircularProgress,
  Chip, IconButton, InputAdornment, Stepper, Step, StepLabel
} from '@mui/material';
import { PersonAdd, Visibility, VisibilityOff, School, CheckCircle } from '@mui/icons-material';
import API from '../services/api';
import toast from 'react-hot-toast';

const SRI_LANKA_DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
  'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
  'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
  'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
];

const steps = ['Student Details', 'Select Classes', 'Confirm'];

const AddNewStudentModal = ({ open, onClose, preSelectedClassId }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', parent_phone: '',
    district: '', city: '', village: '', password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      loadClasses();
      if (preSelectedClassId) setSelectedClasses([preSelectedClassId]);
    } else {
      resetAll();
    }
  }, [open, preSelectedClassId]);

  const resetAll = () => {
    setActiveStep(0);
    setForm({ name: '', email: '', phone: '', parent_phone: '', district: '', city: '', village: '', password: '' });
    setSelectedClasses(preSelectedClassId ? [preSelectedClassId] : []);
    setErrors({});
    setResult(null);
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await API.get('/enrollment/available-classes');
      setClasses(res.data.data);
    } catch { toast.error('Failed to load classes.'); }
    finally { setLoading(false); }
  };

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validateStep0 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.password || form.password.length < 6) e.password = 'Minimum 6 characters';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep0()) return;
    setActiveStep(prev => prev + 1);
  };

  const toggleClass = (id) => {
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await API.post('/enrollment/register-and-enroll', {
        ...form,
        class_ids: selectedClasses
      });
      setResult(res.data);
      setActiveStep(2);
      toast.success('Student registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonAdd color="primary" /> Add New Student
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {/* Step 0: Student Details */}
        {activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Full Name" value={form.name}
                onChange={e => f('name', e.target.value)}
                error={!!errors.name} helperText={errors.name} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" type="email" value={form.email}
                onChange={e => f('email', e.target.value)}
                error={!!errors.email} helperText={errors.email} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={form.phone}
                onChange={e => f('phone', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Parent Phone" value={form.parent_phone}
                onChange={e => f('parent_phone', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>District</InputLabel>
                <Select value={form.district} label="District"
                  onChange={e => f('district', e.target.value)}>
                  {SRI_LANKA_DISTRICTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="City / Town" value={form.city}
                onChange={e => f('city', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Village" value={form.village}
                onChange={e => f('village', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">Login credentials for student</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Password" value={form.password}
                onChange={e => f('password', e.target.value)}
                type={showPassword ? 'text' : 'password'}
                error={!!errors.password} helperText={errors.password || 'Student will use this to login'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }} />
            </Grid>
          </Grid>
        )}

        {/* Step 1: Select Classes */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select classes to enroll this student (optional — can enroll later)
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : classes.length === 0 ? (
              <Alert severity="info">No classes available. Student will be registered without class enrollment.</Alert>
            ) : (
              <List dense sx={{ border: '1px solid #e0e0e0', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
                {classes.map(cls => (
                  <ListItem key={cls.id} button onClick={() => toggleClass(cls.id)}>
                    <Checkbox checked={selectedClasses.includes(cls.id)} size="small" sx={{ mr: 1 }} />
                    <ListItemText
                      primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={600}>{cls.name}</Typography>
                        {cls.subject && <Chip label={cls.subject} size="small" variant="outlined" />}
                      </Box>}
                      secondary={`${cls.class_day || ''} ${cls.start_time || ''} ${cls.end_time ? '- ' + cls.end_time : ''} | Rs.${cls.monthly_fee}/mo | ${cls._count?.enrollments || 0} students`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {selectedClasses.length > 0 && (
              <Alert severity="success" sx={{ mt: 1 }}>
                {selectedClasses.length} class{selectedClasses.length > 1 ? 'es' : ''} selected
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: Success */}
        {activeStep === 2 && result && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} mb={1}>Student Registered!</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>{result.message}</Typography>
            <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2, textAlign: 'left', display: 'inline-block', minWidth: 260 }}>
              <Typography variant="body2"><b>Name:</b> {result.data?.name}</Typography>
              <Typography variant="body2"><b>Student ID:</b> {result.data?.student_id}</Typography>
              {result.data?.email && <Typography variant="body2"><b>Email:</b> {result.data?.email}</Typography>}
              {result.data?.enrolledClasses?.length > 0 && (
                <Typography variant="body2"><b>Enrolled in:</b> {result.data.enrolledClasses.join(', ')}</Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep === 2 ? (
          <Button variant="contained" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button onClick={activeStep === 0 ? onClose : () => setActiveStep(prev => prev - 1)}>
              {activeStep === 0 ? 'Cancel' : 'Back'}
            </Button>
            {activeStep === 0 && (
              <Button variant="contained" onClick={handleNext}>Next</Button>
            )}
            {activeStep === 1 && (
              <Button variant="contained" color="success"
                onClick={handleSubmit} disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} /> : <PersonAdd />}>
                {submitting ? 'Registering...' : 'Register Student'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddNewStudentModal;
