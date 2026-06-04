import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, ListSubheader, Collapse, IconButton, Tooltip, Avatar,
  InputAdornment, List, ListItem, ListItemAvatar, ListItemText, Divider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Add, Edit, Delete, School, People, PersonAdd, Search, PersonRemove, EventNote, Quiz, Payments as PaymentsIcon, Message, Assessment, QrCodeScanner } from '@mui/icons-material';
import QrStudentEnrollModal from '../../components/QrStudentEnrollModal';
import AddNewStudentModal from '../../components/AddNewStudentModal';
import EnrollExistingStudentModal from '../../components/EnrollExistingStudentModal';
import toast from 'react-hot-toast';
import API from '../../services/api';
import { ExamsDialog } from './ClassExams';
import { PaymentsDialog } from './ClassPayments';
import { MessagesDialog } from './ClassMessages';
import { ReportsDialog } from './ClassReports';
import ClassStudentList from '../../components/ClassStudentList';

const CLASS_TYPES = [
  { value: 'hall', label: 'Hall Classes' },
  { value: 'group', label: 'Group Classes' },
  { value: 'online', label: 'Online Classes' },
];

const DAYS = [
  { value: 'Monday',    label: 'සඳුදා (Monday)' },
  { value: 'Tuesday',   label: 'අඟහරුවාදා (Tuesday)' },
  { value: 'Wednesday', label: 'බදාදා (Wednesday)' },
  { value: 'Thursday',  label: 'බ්‍රහස්පතින්දා (Thursday)' },
  { value: 'Friday',    label: 'සිකුරාදා (Friday)' },
  { value: 'Saturday',  label: 'සෙනසුරාදා (Saturday)' },
  { value: 'Sunday',    label: 'ඉරිදා (Sunday)' },
];

const TYPE_COLORS = { hall: 'primary', group: 'success', online: 'warning' };

const GRADES = [
  { group: 'Primary & Secondary', options: [
    'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
    'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11',
  ]},
  { group: 'Advanced Level', options: ['A/L', 'A/L Revision'] },
];

const AL_GRADES = ['A/L', 'A/L Revision'];
const AL_YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i);

const emptyForm = {
  institute_id: '',
  name: '',
  grade: '',
  al_year: '',
  class_day: '',
  start_time: '',
  end_time: '',
  monthly_fee: '',
  class_type: 'hall',
};

// ── Class Form Dialog ────────────────────────────────────────────────────────

const ClassFormDialog = ({ open, onClose, onSaved, editData, institutes }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setErrors({});
      const defaultInstId = institutes.length === 1 ? String(institutes[0].id) : '';
      if (editData) {
        setForm({
          institute_id: editData.institute_id ? String(editData.institute_id) : defaultInstId,
          name: editData.name || '',
          grade: editData.grade || '',
          al_year: editData.al_year ? String(editData.al_year) : '',
          class_day: editData.class_day || '',
          start_time: editData.start_time || '',
          end_time: editData.end_time || '',
          monthly_fee: editData.monthly_fee !== undefined ? String(editData.monthly_fee) : '',
          class_type: editData.class_type || 'hall',
        });
      } else {
        setForm({ ...emptyForm, institute_id: defaultInstId });
      }
    }
  }, [open, editData, institutes]);

  const validate = () => {
    const errs = {};
    const isAL = AL_GRADES.includes(form.grade);
    if (!form.institute_id) errs.institute_id = 'ආයතනය තෝරන්න / Please select an institute.';
    if (!form.name.trim()) errs.name = 'Class name is required.';
    if (!form.grade) errs.grade = 'Grade/Level is required.';
    if (isAL && !form.al_year) errs.al_year = 'A/L Year is required.';
    if (!form.class_day) errs.class_day = 'Day is required.';
    if (form.monthly_fee !== '' && (isNaN(Number(form.monthly_fee)) || Number(form.monthly_fee) < 0)) {
      errs.monthly_fee = 'Fee must be a positive number.';
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      errs.end_time = 'End time must be after start time.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'grade' && !AL_GRADES.includes(value) ? { al_year: '' } : {}),
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const isAL = AL_GRADES.includes(form.grade);
      const payload = {
        ...form,
        institute_id: Number(form.institute_id),
        al_year: isAL && form.al_year ? Number(form.al_year) : null,
        monthly_fee: form.monthly_fee === '' ? 0 : Number(form.monthly_fee),
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      };
      if (editData) {
        const res = await API.put(`/teacher/classes/${editData.id}`, payload);
        toast.success(res.data.message || 'Class updated.');
      } else {
        const res = await API.post('/teacher/classes', payload);
        toast.success(res.data.message || 'Class created.');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editData ? 'Edit Class' : 'Add New Class'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          select
          label="Institute / ආයතනය"
          value={form.institute_id}
          onChange={handleChange('institute_id')}
          error={!!errors.institute_id}
          helperText={errors.institute_id}
          fullWidth
          required
          disabled={!!editData || institutes.length <= 1}
        >
          {institutes.length === 0 && (
            <MenuItem value="" disabled>No institutes connected</MenuItem>
          )}
          {institutes.map((inst) => (
            <MenuItem key={inst.id} value={String(inst.id)}>
              {inst.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Class Name"
          value={form.name}
          onChange={handleChange('name')}
          error={!!errors.name}
          helperText={errors.name}
          fullWidth
          required
        />

        <TextField
          select
          label="Grade / Level"
          value={form.grade}
          onChange={handleChange('grade')}
          error={!!errors.grade}
          helperText={errors.grade}
          fullWidth
          required
        >
          {GRADES.map((grp) => [
            <ListSubheader key={grp.group}>{grp.group}</ListSubheader>,
            ...grp.options.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            )),
          ])}
        </TextField>

        <Collapse in={AL_GRADES.includes(form.grade)} unmountOnExit sx={{ width: '100%' }}>
          <TextField
            select
            label="A/L Year"
            value={form.al_year}
            onChange={handleChange('al_year')}
            error={!!errors.al_year}
            helperText={errors.al_year}
            fullWidth
            required
            sx={{ mb: 2 }}
          >
            {AL_YEARS.map((y) => (
              <MenuItem key={y} value={String(y)}>{y}</MenuItem>
            ))}
          </TextField>
        </Collapse>

        <TextField
          select
          label="සතිය දිනය (Day)"
          value={form.class_day}
          onChange={handleChange('class_day')}
          error={!!errors.class_day}
          helperText={errors.class_day}
          fullWidth
          required
        >
          {DAYS.map((d) => (
            <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Start Time"
            type="time"
            value={form.start_time}
            onChange={handleChange('start_time')}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Time"
            type="time"
            value={form.end_time}
            onChange={handleChange('end_time')}
            error={!!errors.end_time}
            helperText={errors.end_time}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <TextField
          label="Class Fee (Rs.)"
          type="number"
          value={form.monthly_fee}
          onChange={handleChange('monthly_fee')}
          error={!!errors.monthly_fee}
          helperText={errors.monthly_fee}
          fullWidth
          inputProps={{ min: 0 }}
        />

        <TextField
          select
          label="Class Type"
          value={form.class_type}
          onChange={handleChange('class_type')}
          fullWidth
        >
          {CLASS_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Enroll Students Dialog ───────────────────────────────────────────────────

const EnrollDialog = ({ open, onClose, classData, onEnrollmentChanged }) => {
  const [allStudents, setAllStudents] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(new Set());
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!classData) return;
    setLoading(true);
    try {
      const [studentsRes, enrolledRes] = await Promise.all([
        API.get('/teacher/institute-students'),
        API.get(`/teacher/classes/${classData.id}/students`),
      ]);
      setAllStudents(studentsRes.data.data);
      setEnrolledIds(new Set(enrolledRes.data.data.map((s) => s.id)));
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [classData]);

  useEffect(() => {
    if (open) { setSearch(''); load(); }
  }, [open, load]);

  const handleEnroll = async (student) => {
    setProcessing((prev) => new Set(prev).add(student.id));
    try {
      await API.post(`/teacher/classes/${classData.id}/enroll`, { student_id: student.id });
      setEnrolledIds((prev) => new Set(prev).add(student.id));
      toast.success(`${student.name} enrolled.`);
      onEnrollmentChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to enroll.');
    } finally {
      setProcessing((prev) => { const s = new Set(prev); s.delete(student.id); return s; });
    }
  };

  const handleUnenroll = async (student) => {
    setProcessing((prev) => new Set(prev).add(student.id));
    try {
      await API.delete(`/teacher/classes/${classData.id}/students/${student.id}`);
      setEnrolledIds((prev) => { const s = new Set(prev); s.delete(student.id); return s; });
      toast.success(`${student.name} removed.`);
      onEnrollmentChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove.');
    } finally {
      setProcessing((prev) => { const s = new Set(prev); s.delete(student.id); return s; });
    }
  };

  const filtered = allStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id || '').toLowerCase().includes(search.toLowerCase())
  );

  // Enrolled first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    const aEnrolled = enrolledIds.has(a.id);
    const bEnrolled = enrolledIds.has(b.id);
    if (aEnrolled !== bEnrolled) return aEnrolled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const enrolledCount = [...allStudents].filter((s) => enrolledIds.has(s.id)).length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        <Box>
          Enroll Students
          <Typography variant="body2" color="text.secondary" fontWeight={400}>
            {classData?.name} &mdash; {enrolledCount} enrolled
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important', px: 2 }}>
        <TextField
          placeholder="Search by name or student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : sorted.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {search ? 'No students match your search.' : 'No students in this institute yet.'}
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding>
              {sorted.map((student, idx) => {
                const enrolled = enrolledIds.has(student.id);
                const busy = processing.has(student.id);
                return (
                  <React.Fragment key={student.id}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItem
                      sx={{ py: 1.2, bgcolor: enrolled ? '#f0f7ff' : 'inherit' }}
                      secondaryAction={
                        enrolled ? (
                          <Tooltip title="Remove from class">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleUnenroll(student)}
                                disabled={busy}
                              >
                                {busy ? <CircularProgress size={16} /> : <PersonRemove fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Enroll in class">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEnroll(student)}
                                disabled={busy}
                              >
                                {busy ? <CircularProgress size={16} /> : <PersonAdd fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: enrolled ? '#1976d2' : '#9e9e9e',
                            width: 36,
                            height: 36,
                            fontSize: 15,
                          }}
                        >
                          {student.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{student.name}</Typography>
                            {enrolled && (
                              <Chip label="Enrolled" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </Box>
                        }
                        secondary={student.student_id || '—'}
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Attendance Dialog ────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

const STATUS_META = {
  present: { label: 'Present', color: 'success' },
  late:    { label: 'Late',    color: 'warning' },
  absent:  { label: 'Absent',  color: 'error'   },
};

const AttendanceDialog = ({ open, onClose, classData }) => {
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async (cls, d) => {
    if (!cls) return;
    setLoading(true);
    try {
      const res = await API.get(`/attendance/class/${cls.id}/students`, { params: { date: d } });
      setStudents(res.data.data);
      const initial = {};
      res.data.data.forEach((s) => { initial[s.id] = s.today_status || 'absent'; });
      setStatuses(initial);
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && classData) {
      const d = today();
      setDate(d);
      loadStudents(classData, d);
    }
  }, [open, classData, loadStudents]);

  const handleDateChange = (e) => {
    const d = e.target.value;
    setDate(d);
    loadStudents(classData, d);
  };

  const handleStatusChange = (studentId, newStatus) => {
    if (!newStatus) return;
    setStatuses((prev) => ({ ...prev, [studentId]: newStatus }));
  };

  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const attendance_list = students.map((s) => ({
        student_id: s.id,
        status: statuses[s.id] || 'absent',
      }));
      await API.post('/attendance/manual', {
        class_id: classData.id,
        date,
        attendance_list,
      });
      toast.success('Attendance saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const counts = students.reduce(
    (acc, s) => { acc[statuses[s.id] || 'absent']++; return acc; },
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        <Box>
          Attendance
          <Typography variant="body2" color="text.secondary" fontWeight={400}>
            {classData?.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important', px: 2 }}>
        {/* Date picker */}
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={handleDateChange}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />

        {/* Summary chips */}
        {!loading && students.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <Chip
                key={key}
                label={`${meta.label}: ${counts[key]}`}
                color={meta.color}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : students.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <People sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              No students enrolled. Add students via "Enroll Students" first.
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding>
              {students.map((s, idx) => {
                const status = statuses[s.id] || 'absent';
                return (
                  <React.Fragment key={s.id}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItem sx={{ py: 1, gap: 1 }}>
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar
                          sx={{
                            width: 36, height: 36, fontSize: 15,
                            bgcolor:
                              status === 'present' ? '#2e7d32' :
                              status === 'late'    ? '#e65100' : '#9e9e9e',
                          }}
                        >
                          {s.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={600}>{s.name}</Typography>}
                        secondary={s.student_id || '—'}
                        sx={{ flex: 1 }}
                      />
                      <ToggleButtonGroup
                        value={status}
                        exclusive
                        onChange={(_, v) => handleStatusChange(s.id, v)}
                        size="small"
                      >
                        <ToggleButton
                          value="present"
                          sx={{
                            px: 1.2, py: 0.4, fontSize: 11,
                            '&.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } },
                          }}
                        >
                          Present
                        </ToggleButton>
                        <ToggleButton
                          value="late"
                          sx={{
                            px: 1.2, py: 0.4, fontSize: 11,
                            '&.Mui-selected': { bgcolor: '#e65100', color: '#fff', '&:hover': { bgcolor: '#bf360c' } },
                          }}
                        >
                          Late
                        </ToggleButton>
                        <ToggleButton
                          value="absent"
                          sx={{
                            px: 1.2, py: 0.4, fontSize: 11,
                            '&.Mui-selected': { bgcolor: '#c62828', color: '#fff', '&:hover': { bgcolor: '#b71c1c' } },
                          }}
                        >
                          Absent
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || students.length === 0}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <EventNote />}
        >
          {saving ? 'Saving…' : 'Save Attendance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${((hour % 12) || 12)}:${m} ${ampm}`;
};

// ── Main Page ────────────────────────────────────────────────────────────────

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [filterInstitute, setFilterInstitute] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [studentListClass, setStudentListClass] = useState(null);
  const [enrollClass, setEnrollClass] = useState(null);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [examsClass, setExamsClass] = useState(null);
  const [paymentsClass, setPaymentsClass] = useState(null);
  const [messagesClass, setMessagesClass] = useState(null);
  const [reportsClass, setReportsClass]   = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [enrollExistingOpen, setEnrollExistingOpen] = useState(false);
  const [enrollClassId, setEnrollClassId] = useState(null);

  const fetchClasses = useCallback(() => {
    setLoading(true);
    const params = filterInstitute ? { institute_id: filterInstitute } : {};
    API.get('/teacher/classes', { params })
      .then((res) => setClasses(res.data.data))
      .catch(() => toast.error('Failed to load classes.'))
      .finally(() => setLoading(false));
  }, [filterInstitute]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    API.get('/teacher/institutes')
      .then((res) => setInstitutes(res.data.data || []))
      .catch(console.error);
  }, []);

  const handleAdd = () => { setEditData(null); setFormOpen(true); };
  const handleEdit = (cls) => { setEditData(cls); setFormOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteTarget(null);
    try {
      const res = await API.delete(`/teacher/classes/${deleteTarget.id}`);
      toast.success(res.data.message || 'Class deleted.');
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete class.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>My Classes</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="success" startIcon={<QrCodeScanner />} onClick={() => setEnrollOpen(true)}>
            Enroll Student
          </Button>
          <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => setAddStudentOpen(true)}>
            Add New Student
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Add Class
          </Button>
        </Box>
      </Box>

      {institutes.length > 1 && (
        <Box sx={{ mb: 2 }}>
          <TextField
            select
            size="small"
            label="Filter by Institute"
            value={filterInstitute}
            onChange={(e) => setFilterInstitute(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">All Institutes</MenuItem>
            {institutes.map((inst) => (
              <MenuItem key={inst.id} value={String(inst.id)}>{inst.name}</MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : classes.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 6 }}>
            <School sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No classes yet. Click "Add Class" to get started.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Class Name</TableCell>
                {institutes.length > 1 && <TableCell sx={{ fontWeight: 700 }}>Institute</TableCell>}
                <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fee (Rs.)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Students</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{cls.name}</Typography>
                    {cls.grade && (
                      <Typography variant="caption" color="text.secondary">
                        {cls.grade}{cls.al_year ? ` · ${cls.al_year}` : ''}
                      </Typography>
                    )}
                  </TableCell>
                  {institutes.length > 1 && (
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                        {cls.institute_name || '—'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    {DAYS.find((d) => d.value === cls.class_day)?.label.split(' ')[0] || cls.class_day || '—'}
                  </TableCell>
                  <TableCell>
                    {cls.start_time || cls.end_time
                      ? `${formatTime(cls.start_time)} – ${formatTime(cls.end_time)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {cls.monthly_fee > 0 ? `Rs. ${Number(cls.monthly_fee).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={CLASS_TYPES.find((t) => t.value === cls.class_type)?.label || cls.class_type}
                      color={TYPE_COLORS[cls.class_type] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<People />}
                      label={Number(cls.student_count ?? 0)}
                      size="small"
                      variant="outlined"
                      color={Number(cls.student_count) > 0 ? 'primary' : 'default'}
                      onClick={() => setStudentListClass(cls)}
                      sx={{ cursor: 'pointer' }}
                      title="View enrolled students"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Reports">
                      <IconButton size="small" sx={{ color: '#6a1b9a' }} onClick={() => setReportsClass(cls)}>
                        <Assessment fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Messages">
                      <IconButton size="small" sx={{ color: '#e65100' }} onClick={() => setMessagesClass(cls)}>
                        <Message fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Payments">
                      <IconButton size="small" sx={{ color: '#2e7d32' }} onClick={() => setPaymentsClass(cls)}>
                        <PaymentsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Exams">
                      <IconButton size="small" sx={{ color: '#0288d1' }} onClick={() => setExamsClass(cls)}>
                        <Quiz fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Attendance">
                      <IconButton size="small" sx={{ color: '#7b1fa2' }} onClick={() => setAttendanceClass(cls)}>
                        <EventNote fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Enroll existing students">
                      <IconButton size="small" color="primary" onClick={() => { setEnrollClassId(cls.id); setEnrollExistingOpen(true); }}>
                        <People fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Enroll Students">
                      <IconButton size="small" color="success" onClick={() => setEnrollClass(cls)}>
                        <PersonAdd fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => handleEdit(cls)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(cls)}
                          disabled={deletingId === cls.id}
                        >
                          {deletingId === cls.id ? <CircularProgress size={16} /> : <Delete fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <ClassStudentList
        open={!!studentListClass}
        onClose={() => setStudentListClass(null)}
        classData={studentListClass}
      />

      <ClassFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchClasses}
        editData={editData}
        institutes={institutes}
      />

      <EnrollDialog
        open={!!enrollClass}
        onClose={() => setEnrollClass(null)}
        classData={enrollClass}
        onEnrollmentChanged={fetchClasses}
      />

      <AttendanceDialog
        open={!!attendanceClass}
        onClose={() => setAttendanceClass(null)}
        classData={attendanceClass}
      />

      <ExamsDialog
        open={!!examsClass}
        onClose={() => setExamsClass(null)}
        classData={examsClass}
      />

      <PaymentsDialog
        open={!!paymentsClass}
        onClose={() => setPaymentsClass(null)}
        classData={paymentsClass}
      />

      <MessagesDialog
        open={!!messagesClass}
        onClose={() => setMessagesClass(null)}
        classData={messagesClass}
      />

      <ReportsDialog
        open={!!reportsClass}
        onClose={() => setReportsClass(null)}
        classData={reportsClass}
      />

      <QrStudentEnrollModal open={enrollOpen} onClose={() => setEnrollOpen(false)} />

      <AddNewStudentModal open={addStudentOpen} onClose={() => setAddStudentOpen(false)} />

      <EnrollExistingStudentModal
        open={enrollExistingOpen}
        preClassId={enrollClassId}
        onClose={() => { setEnrollExistingOpen(false); setEnrollClassId(null); fetchClasses(); }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Delete Class
        </DialogTitle>
        <DialogContent>
          <Typography>
            <strong>"{deleteTarget?.name}"</strong> class delete කිරීමට අවශ්‍යද?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            මෙම ක්‍රියාව undo කළ නොහැක. Enrolled students සහ attendance records ද ඉවත් වේ.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} startIcon={<Delete />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Classes;
