import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../../services/api';
import toast from 'react-hot-toast';
import {
  Box, Container, Paper, Typography, TextField, Button, CircularProgress,
  MenuItem, FormControl, InputLabel, Select, OutlinedInput, Checkbox,
  ListItemText, Chip, ListSubheader,
} from '@mui/material';
import { School } from '@mui/icons-material';

const SL_DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo',
  'Galle','Gampaha','Hambantota','Jaffna','Kalutara',
  'Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar',
  'Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
  'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya',
];

const SUBJECT_GROUPS = [
  { group: 'Languages', subjects: ['Sinhala (සිංහල)', 'Tamil (දෙමළ)', 'English (ඉංග්‍රීසි)'] },
  { group: 'Mathematics', subjects: ['Mathematics (ගණිතය)', 'Combined Mathematics (සංයුක්ත ගණිතය)'] },
  { group: 'Sciences', subjects: ['Science (විද්‍යාව)', 'Physics (භෞතික විද්‍යාව)', 'Chemistry (රසායන විද්‍යාව)', 'Biology (ජීව විද්‍යාව)'] },
  { group: 'Social Studies', subjects: ['History (ඉතිහාසය)', 'Geography (භූගෝල විද්‍යාව)', 'Civics (පුරවැසි අධ්‍යාපනය)'] },
  { group: 'Commerce', subjects: ['Business Studies (ව්‍යාපාර අධ්‍යයනය)', 'Accounting (ගිණුම්කරණය)', 'Economics (ආර්ථික විද්‍යාව)'] },
  { group: 'Technology', subjects: ['ICT (තොරතුරු හා සන්නිවේදන තාක්ෂණය)', 'Technology (තාක්ෂණය)'] },
  { group: 'Arts', subjects: ['Art (චිත්‍ර කලාව)', 'Music (සංගීතය)', 'Dancing (නර්තනය)', 'Drama (නාට්‍ය කලාව)'] },
  { group: 'Religion', subjects: ['Buddhism (බෞද්ධ ධර්මය)', 'Hinduism (හින්දු ආගම)', 'Islam (ඉස්ලාම් ආගම)', 'Christianity (කිතු දහම)'] },
  { group: 'Other', subjects: ['Physical Education (ශාරීරික අධ්‍යාපනය)', 'Agriculture (කෘෂිකර්මය)', 'Other (වෙනත්)'] },
];

const Register = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    address: '', parent_phone: '', institute_code: '',
    district: '', city: '', village: '', subjects: [],
  });

  const isInstitute = role === 'institute';
  const isTeacher = role === 'teacher';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isInstitute) {
        await API.post('/auth/register/institute', {
          name: form.name, email: form.email, password: form.password,
          phone: form.phone, address: form.address,
        });
        toast.success('Institute registered! Please login.');
      } else {
        await API.post('/auth/register/user', {
          name: form.name, email: form.email, password: form.password,
          phone: form.phone, parent_phone: form.parent_phone,
          institute_code: isTeacher ? form.institute_code : undefined, role,
          district: form.district || undefined,
          city: form.city || undefined,
          village: isTeacher ? (form.village || undefined) : undefined,
          subjects: isTeacher ? (form.subjects.length > 0 ? form.subjects : undefined) : undefined,
        });
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
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(135deg, ${color} 0%, #90caf9 100%)`, display: 'flex', alignItems: 'center', py: 4 }}>
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
                {role === 'student' && (
                  <>
                    <TextField fullWidth label="Parent Phone Number" value={form.parent_phone}
                      onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} sx={{ mb: 2 }} />
                    <TextField
                      select fullWidth label="District *" value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      sx={{ mb: 2 }} required
                    >
                      {SL_DISTRICTS.map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </TextField>
                    <TextField fullWidth label="City / Town" value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="ඔබේ නගරය හෝ ගම" sx={{ mb: 2 }} />
                  </>
                )}

                {isTeacher && (
                  <>
                    <TextField fullWidth label="Institute Code *" value={form.institute_code}
                      onChange={(e) => setForm({ ...form, institute_code: e.target.value })}
                      sx={{ mb: 2 }} required helperText="Get this code from your institute" />
                    <TextField
                      select fullWidth label="District *" value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      sx={{ mb: 2 }} required
                    >
                      {SL_DISTRICTS.map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </TextField>

                    <TextField fullWidth label="City / Town" value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="නගරය" sx={{ mb: 2 }} />

                    <TextField fullWidth label="Village / Area (ගම)" value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                      placeholder="ගම හෝ පදිංචි ප්‍රදේශය" sx={{ mb: 2 }} />

                    <FormControl fullWidth sx={{ mb: 2 }} required>
                      <InputLabel>Subject(s) Taught * (ඉගැන්වෙන විෂය)</InputLabel>
                      <Select
                        multiple
                        value={form.subjects}
                        onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                        input={<OutlinedInput label="Subject(s) Taught * (ඉගැන්වෙන විෂය)" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((v) => (
                              <Chip key={v} label={v} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: 11 }} />
                            ))}
                          </Box>
                        )}
                        MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                      >
                        {SUBJECT_GROUPS.map((grp) => [
                          <ListSubheader key={grp.group} sx={{ fontWeight: 700, lineHeight: '32px', color: '#f57c00' }}>
                            {grp.group}
                          </ListSubheader>,
                          ...grp.subjects.map((s) => (
                            <MenuItem key={s} value={s} sx={{ pl: 3, py: 0.5 }}>
                              <Checkbox checked={form.subjects.includes(s)} size="small" sx={{ p: 0.5, color: '#f57c00', '&.Mui-checked': { color: '#f57c00' } }} />
                              <ListItemText primary={s} primaryTypographyProps={{ fontSize: 13 }} />
                            </MenuItem>
                          )),
                        ])}
                      </Select>
                    </FormControl>
                  </>
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
