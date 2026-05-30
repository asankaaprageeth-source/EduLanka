import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Avatar, Divider, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, InputAdornment, IconButton,
  MenuItem, List, ListItemButton, ListItemText, ListItemAvatar,
  Stepper, Step, StepLabel,
} from '@mui/material';
import {
  School, Person, CalendarToday, AccessTime, AttachMoney,
  Search, Close, ArrowBack, Add, ExitToApp, Business,
} from '@mui/icons-material';
import API from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_COLORS = { hall: 'primary', group: 'success', online: 'warning' };
const TYPE_LABELS = { hall: 'Hall', group: 'Group', online: 'Online' };

const DAYS_SI = {
  Monday: 'සඳුදා', Tuesday: 'අඟහරුවාදා', Wednesday: 'බදාදා',
  Thursday: 'බ්‍රහස්පතින්දා', Friday: 'සිකුරාදා',
  Saturday: 'සෙනසුරාදා', Sunday: 'ඉරිදා',
};

const GRADES = [
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11',
  'A/L','A/L Revision',
];

const AL_GRADES = ['A/L', 'A/L Revision'];

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Enrolled class card ──────────────────────────────────────────────────────
const ClassCard = ({ cls, onLeave }) => {
  const gradeLabel = cls.grade
    ? (AL_GRADES.includes(cls.grade) && cls.al_year ? `${cls.grade} · ${cls.al_year}` : cls.grade)
    : null;

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ bgcolor: '#388e3c', px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
          <School sx={{ color: 'white', fontSize: 22 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} color="white" noWrap>{cls.name}</Typography>
          {gradeLabel && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>{gradeLabel}</Typography>}
        </Box>
        {cls.class_type && (
          <Chip
            label={TYPE_LABELS[cls.class_type] || cls.class_type}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
          />
        )}
      </Box>

      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {cls.institute_name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business sx={{ fontSize: 16, color: '#1976d2' }} />
            <Typography variant="body2" color="primary" fontWeight={500}>{cls.institute_name}</Typography>
          </Box>
        )}
        {cls.teacher_name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{cls.teacher_name}</Typography>
          </Box>
        )}
        {cls.class_day && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{DAYS_SI[cls.class_day] || ''} ({cls.class_day})</Typography>
            </Box>
          </>
        )}
        {cls.start_time && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">
              {formatTime(cls.start_time)}{cls.end_time ? ` – ${formatTime(cls.end_time)}` : ''}
            </Typography>
          </Box>
        )}
        {cls.monthly_fee != null && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight={600}>Rs. {Number(cls.monthly_fee).toLocaleString()} / month</Typography>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth variant="outlined" color="error" size="small"
          startIcon={<ExitToApp />}
          onClick={() => onLeave(cls)}
        >
          Leave Class
        </Button>
      </Box>
    </Paper>
  );
};

// ── Available class row in join modal ────────────────────────────────────────
const AvailableClassRow = ({ cls, onJoin }) => {
  const gradeLabel = cls.grade
    ? (AL_GRADES.includes(cls.grade) && cls.al_year ? `${cls.grade} · ${cls.al_year}` : cls.grade)
    : null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>{cls.name}</Typography>
            {gradeLabel && <Chip label={gradeLabel} size="small" variant="outlined" />}
            {cls.class_type && (
              <Chip label={TYPE_LABELS[cls.class_type]} color={TYPE_COLORS[cls.class_type] || 'default'} size="small" />
            )}
          </Box>
          {cls.teacher_name && (
            <Typography variant="caption" color="text.secondary">👨‍🏫 {cls.teacher_name}</Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
            {cls.class_day && (
              <Typography variant="caption" color="text.secondary">
                📅 {DAYS_SI[cls.class_day] || cls.class_day}
              </Typography>
            )}
            {cls.start_time && (
              <Typography variant="caption" color="text.secondary">
                🕐 {formatTime(cls.start_time)}{cls.end_time ? ` – ${formatTime(cls.end_time)}` : ''}
              </Typography>
            )}
            {cls.monthly_fee != null && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                💰 Rs. {Number(cls.monthly_fee).toLocaleString()}/mo
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' }, flexShrink: 0 }}
          onClick={() => onJoin(cls)}
          disabled={!!cls.already_enrolled}
        >
          {cls.already_enrolled ? 'Enrolled' : 'Join'}
        </Button>
      </Box>
    </Paper>
  );
};

// ── Join Class Modal (2-step) ─────────────────────────────────────────────────
const JoinClassModal = ({ open, onClose, onJoined }) => {
  const [step, setStep] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [institutes, setInstitutes] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [confirmCls, setConfirmCls] = useState(null);
  const [joining, setJoining] = useState(false);

  const reset = () => {
    setStep(0); setSearchQ(''); setInstitutes([]); setSelectedInst(null);
    setClasses([]); setGradeFilter(''); setDayFilter(''); setClassSearch('');
    setConfirmCls(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const searchInstitutes = useCallback(async (q) => {
    if (!q || q.trim().length === 0) { setInstitutes([]); return; }
    setSearchLoading(true);
    try {
      const res = await API.get(`/institutes/search?q=${encodeURIComponent(q.trim())}`);
      setInstitutes(res.data.data || []);
    } catch { setInstitutes([]); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchInstitutes(searchQ), 400);
    return () => clearTimeout(t);
  }, [searchQ, searchInstitutes]);

  const selectInstitute = async (inst) => {
    setSelectedInst(inst);
    setStep(1);
    setClassesLoading(true);
    try {
      const res = await API.get(`/institutes/${inst.id}/classes`);
      setClasses(res.data.data || []);
    } catch { setClasses([]); }
    finally { setClassesLoading(false); }
  };

  const filteredClasses = classes.filter((c) => {
    if (gradeFilter && c.grade !== gradeFilter) return false;
    if (dayFilter && c.class_day !== dayFilter) return false;
    if (classSearch && !c.name.toLowerCase().includes(classSearch.toLowerCase())) return false;
    return true;
  });

  const confirmJoin = async () => {
    if (!confirmCls) return;
    setJoining(true);
    try {
      await API.post('/student/classes/join', { classId: confirmCls.id });
      toast.success(`Successfully joined "${confirmCls.name}"!`);
      setConfirmCls(null);
      setClasses((prev) => prev.map((c) => c.id === confirmCls.id ? { ...c, already_enrolled: 1 } : c));
      onJoined();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join class.');
    } finally { setJoining(false); }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add sx={{ color: '#388e3c' }} />
            <Typography fontWeight={700}>Join a Class</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </DialogTitle>

        <Stepper activeStep={step} sx={{ px: 3, pb: 2 }}>
          <Step><StepLabel>Find Institute</StepLabel></Step>
          <Step><StepLabel>Choose Class</StepLabel></Step>
        </Stepper>

        <DialogContent sx={{ pt: 1 }}>
          {step === 0 && (
            <Box>
              <TextField
                fullWidth autoFocus
                label="Search by institute name or code"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: searchLoading ? <CircularProgress size={18} /> : null,
                }}
                sx={{ mb: 2 }}
              />
              {institutes.length > 0 ? (
                <List disablePadding>
                  {institutes.map((inst) => (
                    <ListItemButton
                      key={inst.id}
                      onClick={() => selectInstitute(inst)}
                      sx={{ borderRadius: 2, mb: 0.5, border: '1px solid #e0e0e0' }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#1976d2' }}><Business /></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={inst.name}
                        secondary={`Code: ${inst.institute_code}${inst.address ? ' · ' + inst.address : ''}`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : searchQ.length > 0 && !searchLoading ? (
                <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                  No institutes found.
                </Typography>
              ) : (
                <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                  Type to search for an institute by name or code.
                </Typography>
              )}
            </Box>
          )}

          {step === 1 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton size="small" onClick={() => setStep(0)}><ArrowBack /></IconButton>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{selectedInst?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Code: {selectedInst?.institute_code}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  size="small" label="Search class" value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)} sx={{ flex: 1, minWidth: 140 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                />
                <TextField select size="small" label="Grade" value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="">All Grades</MenuItem>
                  {GRADES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Day" value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="">All Days</MenuItem>
                  {Object.entries(DAYS_SI).map(([en, si]) => (
                    <MenuItem key={en} value={en}>{si}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {classesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : filteredClasses.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  {classes.length === 0 ? 'No classes available at this institute.' : 'No classes match your filters.'}
                </Typography>
              ) : (
                filteredClasses.map((cls) => (
                  <AvailableClassRow key={cls.id} cls={cls} onJoin={setConfirmCls} />
                ))
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Join confirmation dialog */}
      <Dialog open={!!confirmCls} onClose={() => setConfirmCls(null)} PaperProps={{ sx: { borderRadius: 2, p: 1 } }}>
        <DialogTitle fontWeight={700}>Confirm Join</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            <strong>"{confirmCls?.name}"</strong> පන්තියට join වෙන්නද?
          </Typography>
          {confirmCls?.monthly_fee > 0 && (
            <Typography variant="body2" color="text.secondary">
              මාසික ගාස්තුව: <strong>Rs. {Number(confirmCls?.monthly_fee || 0).toLocaleString()}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCls(null)} color="inherit">නැහැ</Button>
          <Button
            onClick={confirmJoin} variant="contained"
            sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
            disabled={joining}
          >
            {joining ? <CircularProgress size={20} color="inherit" /> : 'Join කරන්න'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ── Leave confirmation dialog ────────────────────────────────────────────────
const LeaveDialog = ({ cls, onConfirm, onClose, loading }) => (
  <Dialog open={!!cls} onClose={onClose} PaperProps={{ sx: { borderRadius: 2, p: 1 } }}>
    <DialogTitle fontWeight={700}>Leave Class</DialogTitle>
    <DialogContent>
      <Typography>
        <strong>"{cls?.name}"</strong> පන්තියෙන් ඉවත් වෙන්නද?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        ඔබට නැවත join විය හැකිය.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="inherit">නැහැ</Button>
      <Button onClick={onConfirm} variant="contained" color="error" disabled={loading}>
        {loading ? <CircularProgress size={20} color="inherit" /> : 'ඉවත් වෙන්න'}
      </Button>
    </DialogActions>
  </Dialog>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const StudentClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveCls, setLeaveCls] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const fetchClasses = useCallback(() => {
    API.get('/student/classes')
      .then((res) => setClasses(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleLeave = async () => {
    if (!leaveCls) return;
    setLeaveLoading(true);
    try {
      await API.delete(`/student/classes/${leaveCls.id}`);
      toast.success(`Left "${leaveCls.name}" successfully.`);
      setClasses((prev) => prev.filter((c) => c.id !== leaveCls.id));
      setLeaveCls(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave class.');
    } finally { setLeaveLoading(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>My Classes</Typography>
        <Button
          variant="contained" startIcon={<Add />}
          sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
          onClick={() => setJoinOpen(true)}
        >
          Join a Class
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : classes.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <School sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" gutterBottom>ඔබ කිසිදු පන්තියකට enroll වී නොමැත.</Typography>
          <Button
            variant="contained" startIcon={<Add />} sx={{ mt: 2, bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
            onClick={() => setJoinOpen(true)}
          >
            Join a Class
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {classes.map((cls) => (
            <Grid item xs={12} sm={6} md={4} key={cls.id}>
              <ClassCard cls={cls} onLeave={setLeaveCls} />
            </Grid>
          ))}
        </Grid>
      )}

      <JoinClassModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={() => { setJoinOpen(false); fetchClasses(); }}
      />

      <LeaveDialog
        cls={leaveCls}
        onConfirm={handleLeave}
        onClose={() => setLeaveCls(null)}
        loading={leaveLoading}
      />
    </Box>
  );
};

export default StudentClasses;
