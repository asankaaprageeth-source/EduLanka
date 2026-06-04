import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, ListSubheader, Collapse, IconButton, Tooltip, Avatar,
  InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, School, Search, People, PersonAdd } from '@mui/icons-material';
import AddNewStudentModal from '../../components/AddNewStudentModal';
import EnrollExistingStudentModal from '../../components/EnrollExistingStudentModal';
import toast from 'react-hot-toast';
import API from '../../services/api';

const CLASS_TYPES = [
  { value: 'hall',   label: 'Hall Classes' },
  { value: 'group',  label: 'Group Classes' },
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

const ALL_GRADE_OPTIONS = GRADES.flatMap((g) => g.options);
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
  teacher_id: '',
};

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${(hour % 12) || 12}:${m} ${ampm}`;
}

// ── Class Form Dialog ─────────────────────────────────────────────────────────

const ClassFormDialog = ({ open, onClose, onSaved, editData, teachers, institutes }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setErrors({});
      const defaultInstituteId = institutes.length === 1 ? String(institutes[0].id) : '';
      if (editData) {
        setForm({
          institute_id: editData.institute_id ? String(editData.institute_id) : defaultInstituteId,
          name: editData.name || '',
          grade: editData.grade || '',
          al_year: editData.al_year ? String(editData.al_year) : '',
          class_day: editData.class_day || '',
          start_time: editData.start_time || '',
          end_time: editData.end_time || '',
          monthly_fee: editData.monthly_fee !== undefined ? String(editData.monthly_fee) : '',
          class_type: editData.class_type || 'hall',
          teacher_id: editData.teacher_id ? String(editData.teacher_id) : '',
        });
      } else {
        setForm({ ...emptyForm, institute_id: defaultInstituteId });
      }
    }
  }, [open, editData, institutes]);

  const validate = () => {
    const errs = {};
    const isAL = AL_GRADES.includes(form.grade);
    if (!form.institute_id) errs.institute_id = 'Institute is required.';
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
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      };
      if (editData) {
        const res = await API.put(`/institute/classes/${editData.id}`, payload);
        toast.success(res.data.message || 'Class updated.');
      } else {
        const res = await API.post('/institute/classes', payload);
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
          disabled={institutes.length <= 1}
        >
          {institutes.length === 0 && (
            <MenuItem value="" disabled>Loading...</MenuItem>
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

        <TextField
          select
          label="Teacher (Optional)"
          value={form.teacher_id}
          onChange={handleChange('teacher_id')}
          fullWidth
        >
          <MenuItem value="">— No Teacher —</MenuItem>
          {teachers.map((t) => (
            <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : editData ? 'Update Class' : 'Save Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const InstituteClasses = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentClassId, setAddStudentClassId] = useState(null);
  const [enrollExistingOpen, setEnrollExistingOpen] = useState(false);
  const [enrollClassId, setEnrollClassId] = useState(null);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchClasses = useCallback(() => {
    setLoading(true);
    API.get('/institute/classes')
      .then((res) => setClasses(res.data.data || []))
      .catch(() => toast.error('Failed to load classes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchClasses();
    API.get('/institute/teachers')
      .then((res) => setTeachers(res.data.data || []))
      .catch(console.error);
    API.get('/institute/institutes')
      .then((res) => setInstitutes(res.data.data || []))
      .catch(console.error);
  }, [fetchClasses]);

  const filtered = classes.filter((c) => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher_name?.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !filterGrade || c.grade === filterGrade;
    const matchDay = !filterDay || c.class_day === filterDay;
    const matchType = !filterType || c.class_type === filterType;
    return matchSearch && matchGrade && matchDay && matchType;
  });

  const handleAdd = () => { setEditData(null); setFormOpen(true); };
  const handleEdit = (cls) => { setEditData(cls); setFormOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteTarget(null);
    try {
      const res = await API.delete(`/institute/classes/${deleteTarget.id}`);
      toast.success(res.data.message || 'Class deleted.');
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Classes</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">{classes.length} total</Typography>
          <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => { setAddStudentClassId(null); setAddStudentOpen(true); }}>
            Add New Student
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Add New Class
          </Button>
        </Box>
      </Box>

      {/* Search & Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          placeholder="Search by class or teacher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
        <TextField
          select
          label="Grade"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All Grades</MenuItem>
          {ALL_GRADE_OPTIONS.map((g) => (
            <MenuItem key={g} value={g}>{g}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Day"
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All Days</MenuItem>
          {DAYS.map((d) => (
            <MenuItem key={d.value} value={d.value}>{d.label.split(' ')[0]}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All Types</MenuItem>
          {CLASS_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <School sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {classes.length === 0
                ? 'No classes yet. Click "Add New Class" to get started.'
                : 'No classes match the current filters.'}
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Day & Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Fee (Rs.)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Students</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => {
                const gradeLabel = c.grade
                  ? (AL_GRADES.includes(c.grade) && c.al_year ? `${c.grade} · ${c.al_year}` : c.grade)
                  : null;
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1976d2', width: 36, height: 36 }}>
                          <School sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                          {gradeLabel && (
                            <Typography variant="caption" color="text.secondary">{gradeLabel}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{c.teacher_name || '—'}</TableCell>
                    <TableCell>
                      {c.class_day && (
                        <Typography variant="body2">{c.class_day}</Typography>
                      )}
                      {(c.start_time || c.end_time) && (
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(c.start_time)} – {formatTime(c.end_time)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {c.monthly_fee > 0 ? `Rs. ${Number(c.monthly_fee).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell>
                      {c.class_type && (
                        <Chip
                          label={CLASS_TYPES.find((t) => t.value === c.class_type)?.label || c.class_type}
                          color={TYPE_COLORS[c.class_type] || 'default'}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{c.student_count ?? 0}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Enroll existing students to this class">
                        <IconButton size="small" color="primary" onClick={() => { setEnrollClassId(c.id); setEnrollExistingOpen(true); }}>
                          <People fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Add new student to this class">
                        <IconButton size="small" color="success" onClick={() => { setAddStudentClassId(c.id); setAddStudentOpen(true); }}>
                          <PersonAdd fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleEdit(c)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(c)}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id
                              ? <CircularProgress size={16} />
                              : <Delete fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <AddNewStudentModal
        open={addStudentOpen}
        onClose={() => { setAddStudentOpen(false); setAddStudentClassId(null); }}
        preSelectedClassId={addStudentClassId}
      />

      <EnrollExistingStudentModal
        open={enrollExistingOpen}
        preClassId={enrollClassId}
        onClose={() => { setEnrollExistingOpen(false); setEnrollClassId(null); fetchClasses(); }}
      />

      {/* Add / Edit Dialog */}
      <ClassFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchClasses}
        editData={editData}
        teachers={teachers}
        institutes={institutes}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Delete Class</DialogTitle>
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

export default InstituteClasses;
