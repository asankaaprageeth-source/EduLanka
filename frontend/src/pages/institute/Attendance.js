import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Avatar, Divider, Collapse, IconButton,
  InputAdornment, List, ListItemButton, ListItemText, ListItemAvatar,
  Tabs, Tab,
} from '@mui/material';
import {
  QrCodeScanner, CheckCircle, Warning, Info, ExpandMore, ExpandLess,
  Person, School, PersonAdd, Search, CameraAlt, ManageSearch,
  Close, HowToReg,
} from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
import API from '../../services/api';
import toast from 'react-hot-toast';

const GRADES = [
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11',
  'A/L','A/L Revision',
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Scan result overlay (shown over camera) ──────────────────────────────────
const ScanOverlay = ({ popup, classes, onClassSelect, onManualSelect, onClose }) => {
  if (!popup) return null;
  const { type, data } = popup;

  const base = {
    position: 'absolute', inset: 0, zIndex: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    bgcolor: 'rgba(0,0,0,0.82)', borderRadius: 1,
  };

  if (type === 'success') {
    return (
      <Box sx={base}>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <CheckCircle sx={{ fontSize: 56, color: '#66bb6a', mb: 1 }} />
          <Typography variant="h6" fontWeight={700}>{data.studentName}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>Class: {data.className}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>Time: {data.markedAt}</Typography>
        </Box>
      </Box>
    );
  }

  if (type === 'already_marked') {
    return (
      <Box sx={base}>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Info sx={{ fontSize: 48, color: '#42a5f5', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={700}>{data.studentName}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>දැනටමත් attendance mark කර ඇත</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>{data.className}</Typography>
        </Box>
      </Box>
    );
  }

  if (type === 'multiple_classes') {
    return (
      <Box sx={base}>
        <Box sx={{ textAlign: 'center', color: 'white', px: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{data.studentName}</Typography>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>පංතිය තෝරන්න:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            {(data.classes || []).map((cls) => (
              <Button
                key={cls.id}
                variant="contained"
                sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
                onClick={() => onClassSelect(cls.id)}
              >
                {cls.name}
              </Button>
            ))}
          </Box>
          <Button onClick={onClose} sx={{ mt: 1.5, color: 'rgba(255,255,255,0.6)' }} size="small">Cancel</Button>
        </Box>
      </Box>
    );
  }

  if (type === 'no_active_class') {
    return (
      <Box sx={base}>
        <Box sx={{ textAlign: 'center', color: 'white', px: 2 }}>
          <Warning sx={{ fontSize: 48, color: '#ffa726', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={700}>{data.studentName}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>දැනට active class නොමැත</Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
            startIcon={<ManageSearch />}
            onClick={onManualSelect}
          >
            Manual ලෙස class තෝරන්න
          </Button>
          <Button onClick={onClose} sx={{ mt: 1, color: 'rgba(255,255,255,0.6)', display: 'block', mx: 'auto' }} size="small">
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  return null;
};

// ── Today's log entry ────────────────────────────────────────────────────────
const LogEntry = ({ entry, idx }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 0.5, borderBottom: '1px solid #f0f0f0' }}>
    <Avatar sx={{ width: 36, height: 36, bgcolor: '#388e3c', fontSize: 13, flexShrink: 0 }}>
      {initials(entry.student_name)}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" fontWeight={600} noWrap>{entry.student_name}</Typography>
      <Typography variant="caption" color="text.secondary" noWrap>{entry.class_name}</Typography>
    </Box>
    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
      {entry.markedAt && (
        <Typography variant="caption" color="text.secondary" display="block">{entry.markedAt}</Typography>
      )}
      <Chip label="Present" color="success" size="small" sx={{ height: 20, fontSize: 10 }} />
    </Box>
  </Box>
);

// ── Manual class selector dialog (Case C) ────────────────────────────────────
const ManualClassDialog = ({ open, classes, onSelect, onClose, title }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography fontWeight={700}>{title || 'Class තෝරන්න'}</Typography>
      <IconButton size="small" onClick={onClose}><Close /></IconButton>
    </DialogTitle>
    <DialogContent sx={{ pt: 0 }}>
      {classes.map((cls) => (
        <ListItemButton key={cls.id} onClick={() => onSelect(cls.id)} sx={{ borderRadius: 1, mb: 0.5, border: '1px solid #e0e0e0' }}>
          <ListItemAvatar><Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}><School fontSize="small" /></Avatar></ListItemAvatar>
          <ListItemText primary={cls.name} secondary={cls.grade} />
        </ListItemButton>
      ))}
    </DialogContent>
  </Dialog>
);

// ── Unknown QR modal (Case E) ─────────────────────────────────────────────────
const UnknownQRModal = ({ open, qrData, classes, onSuccess, onClose }) => {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', grade: '', parent_phone: '', class_id: '' });
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab(0); setForm({ name: '', phone: '', grade: '', parent_phone: '', class_id: '' });
      setSearchQ(''); setSearchResults([]); setSelectedStudent(null); setSelectedClassId('');
    }
  }, [open]);

  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await API.get(`/attendance/search-students?q=${encodeURIComponent(searchQ)}`);
        setSearchResults(res.data.data || []);
      } finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleRegister = async () => {
    if (!form.name.trim() || !form.class_id) return;
    setSubmitting(true);
    try {
      const { data } = await API.post('/attendance/quick-register', { ...form, class_id: form.class_id });
      toast.success(`${data.studentName} registered & attendance marked!`);
      onSuccess(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedClassId) return;
    setSubmitting(true);
    try {
      const { data } = await API.post('/attendance/enroll-and-mark', { student_db_id: selectedStudent.id, class_id: selectedClassId });
      toast.success(`${data.studentName} enrolled & attendance marked!`);
      onSuccess(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enroll failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: '#f57c00' }} />
          <Typography fontWeight={700}>නොදන්නා QR Code</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        මෙම QR code system එකේ registered නෑ.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: '1px solid #e0e0e0' }}>
        <Tab label="නව Student Register" icon={<PersonAdd fontSize="small" />} iconPosition="start" sx={{ minHeight: 40 }} />
        <Tab label="දැනටමත් Registered" icon={<Search fontSize="small" />} iconPosition="start" sx={{ minHeight: 40 }} />
      </Tabs>

      <DialogContent>
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="Full Name *" size="small" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField fullWidth label="Phone Number" size="small" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField fullWidth label="Parent Phone" size="small" value={form.parent_phone}
              onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
            <TextField select fullWidth label="Grade/Level" size="small" value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              {GRADES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Class *" size="small" value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
              {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <TextField fullWidth size="small" label="Student Name හෝ Phone සොයන්න"
              value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                endAdornment: searchLoading ? <CircularProgress size={16} /> : null,
              }} sx={{ mb: 1.5 }}
            />
            {selectedStudent ? (
              <Box>
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#388e3c', width: 36, height: 36 }}>{initials(selectedStudent.name)}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{selectedStudent.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedStudent.student_id} · {selectedStudent.phone}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setSelectedStudent(null)}><Close fontSize="small" /></IconButton>
                </Paper>
                <TextField select fullWidth label="Enroll කළ යුතු Class *" size="small" value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}>
                  {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              </Box>
            ) : (
              <List dense>
                {searchResults.map((s) => (
                  <ListItemButton key={s.id} onClick={() => setSelectedStudent(s)} sx={{ borderRadius: 1, mb: 0.5, border: '1px solid #e0e0e0' }}>
                    <ListItemAvatar><Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32, fontSize: 12 }}>{initials(s.name)}</Avatar></ListItemAvatar>
                    <ListItemText primary={s.name} secondary={`${s.student_id || ''} · ${s.phone || ''}`} />
                  </ListItemButton>
                ))}
                {searchQ.length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <Typography color="text.secondary" textAlign="center" variant="body2" sx={{ py: 2 }}>No results found.</Typography>
                )}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        {tab === 0 ? (
          <Button
            onClick={handleRegister} variant="contained"
            sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
            disabled={!form.name.trim() || !form.class_id || submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <HowToReg />}
          >
            Register & Mark
          </Button>
        ) : (
          <Button
            onClick={handleEnroll} variant="contained"
            sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
            disabled={!selectedStudent || !selectedClassId || submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <HowToReg />}
          >
            Enroll & Mark
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Not enrolled modal (Case F) ───────────────────────────────────────────────
const NotEnrolledModal = ({ open, data, classes, onSuccess, onClose }) => {
  const [classId, setClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!open) setClassId(''); }, [open]);

  const handleEnroll = async () => {
    if (!classId) return;
    setSubmitting(true);
    try {
      const res = await API.post('/attendance/enroll-and-mark', { student_db_id: data.studentId, class_id: classId });
      toast.success(`${res.data.studentName} enrolled & marked!`);
      onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle fontWeight={700}>Class Enrolled නෑ</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          <strong>{data?.studentName}</strong> මෙම class එකට enrolled නෑ.
        </Typography>
        <TextField select fullWidth label="Enroll කළ යුතු Class" size="small" value={classId}
          onChange={(e) => setClassId(e.target.value)} sx={{ mt: 2 }}>
          {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleEnroll} variant="contained"
          sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
          disabled={!classId || submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <HowToReg />}
        >
          Enroll & Mark
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Attendance = () => {
  const [cameraStatus, setCameraStatus] = useState('starting');
  const [popup, setPopup] = useState(null);
  const [modal, setModal] = useState(null);
  const [manualClassDialog, setManualClassDialog] = useState(false);
  const [todayLog, setTodayLog] = useState([]);
  const [logTab, setLogTab] = useState('all');
  const [classes, setClasses] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualClassId, setManualClassId] = useState('');
  const [manualStudents, setManualStudents] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

  const qrRef = useRef(null);
  const lastScanRef = useRef({ code: '', time: 0 });
  const processingRef = useRef(false);
  const pendingQrRef = useRef('');
  const popupTimerRef = useRef(null);

  const addToLog = useCallback((data) => {
    setTodayLog((prev) => [{
      id: `new-${Date.now()}`,
      student_name: data.studentName,
      class_name: data.className,
      class_id: data.classId,
      status: 'present',
      markedAt: data.markedAt,
    }, ...prev]);
  }, []);

  const showPopup = useCallback((type, data, autoDismiss = true) => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopup({ type, data });
    if (autoDismiss) {
      popupTimerRef.current = setTimeout(() => setPopup(null), 2500);
    }
  }, []);

  const handleScan = useCallback(async (text) => {
    const now = Date.now();
    if (text === lastScanRef.current.code && now - lastScanRef.current.time < 3000) return;
    if (processingRef.current) return;
    lastScanRef.current = { code: text, time: now };
    processingRef.current = true;
    pendingQrRef.current = text;

    try {
      const { data } = await API.post('/attendance/mark-by-qr', { qr_data: text });
      switch (data.status) {
        case 'marked':
          showPopup('success', data);
          addToLog(data);
          break;
        case 'already_marked':
          showPopup('already_marked', data);
          break;
        case 'multiple_classes':
          showPopup('multiple_classes', data, false);
          break;
        case 'no_active_class':
          showPopup('no_active_class', data, false);
          break;
        case 'not_found':
          setModal({ type: 'unknown_qr' });
          break;
        case 'not_enrolled':
          setModal({ type: 'not_enrolled', data });
          break;
        default:
          break;
      }
    } catch (err) {
      const status = err.response?.data?.status;
      if (status === 'not_found') {
        setModal({ type: 'unknown_qr' });
      } else {
        toast.error(err.response?.data?.message || 'Scan error.');
      }
    } finally {
      processingRef.current = false;
    }
  }, []); // eslint-disable-line

  const handleClassSelectFromPopup = useCallback(async (classId) => {
    setPopup(null);
    processingRef.current = true;
    try {
      const { data } = await API.post('/attendance/mark-by-qr', { qr_data: pendingQrRef.current, class_id: classId });
      if (data.status === 'marked') {
        showPopup('success', data);
        addToLog(data);
      } else if (data.status === 'already_marked') {
        showPopup('already_marked', data);
      } else if (data.status === 'not_enrolled') {
        setModal({ type: 'not_enrolled', data });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally {
      processingRef.current = false;
    }
  }, [showPopup, addToLog]);

  // Camera init
  useEffect(() => {
    let mounted = true;
    const qr = new Html5Qrcode('qr-reader');
    qrRef.current = qr;

    qr.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: { width: 260, height: 260 } },
      handleScan,
      () => {}
    )
    .then(() => { if (mounted) setCameraStatus('active'); })
    .catch((err) => {
      if (!mounted) return;
      const msg = String(err).toLowerCase();
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
        setCameraStatus('denied');
      } else {
        setCameraStatus('error');
      }
    });

    return () => {
      mounted = false;
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      if (qrRef.current?.isScanning) qrRef.current.stop().catch(() => {});
    };
  }, []); // eslint-disable-line

  // Fetch initial data
  useEffect(() => {
    API.get('/institute/classes').then((r) => setClasses(r.data.data || [])).catch(() => {});
    API.get('/attendance/today').then((r) => setTodayLog(r.data.data || [])).catch(() => {});
  }, []);

  // Manual attendance
  const loadManualStudents = async (cid) => {
    setManualLoading(true);
    try {
      const res = await API.get(`/attendance/class/${cid}/students`);
      setManualStudents(res.data.data.map((s) => ({ ...s, status: s.today_status || 'absent' })));
    } finally { setManualLoading(false); }
  };

  const handleManualClassChange = (cid) => { setManualClassId(cid); if (cid) loadManualStudents(cid); };

  const toggleManualStatus = (id) => {
    setManualStudents((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s));
  };

  const saveManual = async () => {
    if (!manualClassId) return;
    setManualSaving(true);
    try {
      await API.post('/attendance/manual', {
        class_id: manualClassId,
        date: new Date().toISOString().split('T')[0],
        attendance_list: manualStudents.map((s) => ({ student_id: s.id, status: s.status })),
      });
      toast.success('Attendance saved!');
      API.get('/attendance/today').then((r) => setTodayLog(r.data.data || [])).catch(() => {});
    } catch { toast.error('Save failed.'); }
    finally { setManualSaving(false); }
  };

  // Log filter tabs
  const logClasses = [...new Map(todayLog.map((e) => [e.class_id, e.class_name])).entries()];
  const filteredLog = logTab === 'all' ? todayLog : todayLog.filter((e) => String(e.class_id) === String(logTab));
  const totalPresent = todayLog.length;

  // Summary per class
  const perClass = Object.values(
    todayLog.reduce((acc, e) => {
      const k = e.class_id;
      if (!acc[k]) acc[k] = { class_name: e.class_name, count: 0 };
      acc[k].count++;
      return acc;
    }, {})
  );

  const today = new Date().toLocaleDateString('si-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Attendance Management</Typography>
          <Typography variant="body2" color="text.secondary">{today}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip icon={<HowToReg />} label={`Present Today: ${totalPresent}`} color="success" variant="outlined" />
          {perClass.map((c) => (
            <Chip key={c.class_name} label={`${c.class_name}: ${c.count}`} size="small" variant="outlined" />
          ))}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: QR Scanner */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#1a1a2e', px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeScanner sx={{ color: '#66bb6a' }} />
              <Typography fontWeight={700} color="white">QR Scanner</Typography>
              <Box sx={{ flex: 1 }} />
              {cameraStatus === 'active' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#66bb6a', animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                  <Typography variant="caption" color="#66bb6a">Scanning</Typography>
                </Box>
              )}
            </Box>

            {/* Camera area */}
            <Box sx={{ position: 'relative', bgcolor: '#000', minHeight: 320 }}>
              {/* The Html5Qrcode target div - always rendered */}
              <div id="qr-reader" style={{ width: '100%' }} />

              {/* Starting overlay */}
              {cameraStatus === 'starting' && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', zIndex: 5 }}>
                  <CircularProgress sx={{ color: '#66bb6a', mb: 1.5 }} />
                  <Typography color="white" variant="body2">Camera starting...</Typography>
                </Box>
              )}

              {/* Error overlay */}
              {(cameraStatus === 'denied' || cameraStatus === 'error') && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a1a', zIndex: 5, p: 3 }}>
                  <CameraAlt sx={{ fontSize: 48, color: '#666', mb: 1 }} />
                  <Typography color="white" variant="body2" textAlign="center" gutterBottom>
                    {cameraStatus === 'denied' ? 'Camera access deny කර ඇත.' : 'Camera load නොවිය.'}
                  </Typography>
                  <Typography color="#aaa" variant="caption" textAlign="center">
                    Browser settings හි camera permission allow කරන්න, page refresh කරන්න.
                  </Typography>
                </Box>
              )}

              {/* Scan result overlay */}
              <ScanOverlay
                popup={popup}
                classes={classes}
                onClassSelect={handleClassSelectFromPopup}
                onManualSelect={() => { setPopup(null); setManualClassDialog(true); }}
                onClose={() => setPopup(null)}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right: Today's log */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={700}>අද Attendance</Typography>
              <Chip label={`සිසුන්: ${filteredLog.length}`} size="small" color="primary" />
            </Box>

            {logClasses.length > 0 && (
              <Tabs
                value={logTab}
                onChange={(_, v) => setLogTab(v)}
                variant="scrollable" scrollButtons="auto"
                sx={{ px: 1, borderBottom: '1px solid #e0e0e0', '& .MuiTab-root': { minHeight: 36, fontSize: 12 } }}
              >
                <Tab label="All Classes" value="all" />
                {logClasses.map(([cid, cname]) => <Tab key={cid} label={cname} value={String(cid)} />)}
              </Tabs>
            )}

            <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1, maxHeight: 380 }}>
              {filteredLog.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                  <QrCodeScanner sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">QR scan කළ විට attendance log ගොඩනැගෙනු ඇත.</Typography>
                </Box>
              ) : (
                filteredLog.map((entry, idx) => <LogEntry key={entry.id || idx} entry={entry} idx={idx} />)
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Manual Attendance (collapsible) */}
      <Paper sx={{ mt: 2.5, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none',
            bgcolor: manualOpen ? '#f5f5f5' : 'transparent', '&:hover': { bgcolor: '#f5f5f5' } }}
          onClick={() => setManualOpen((v) => !v)}
        >
          <ManageSearch sx={{ mr: 1, color: '#1976d2' }} />
          <Typography fontWeight={600}>Manual Attendance</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>(QR scanner work නොකළ අවස්ථා සඳහා)</Typography>
          <Box sx={{ flex: 1 }} />
          {manualOpen ? <ExpandLess /> : <ExpandMore />}
        </Box>

        <Collapse in={manualOpen}>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label="Class" size="small" value={manualClassId}
                  onChange={(e) => handleManualClassChange(e.target.value)}>
                  <MenuItem value=""><em>Select class...</em></MenuItem>
                  {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
              {manualClassId && (
                <Grid item xs={12} sm={8}>
                  {manualLoading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                        {manualStudents.map((s) => (
                          <Chip
                            key={s.id}
                            avatar={<Avatar sx={{ bgcolor: s.status === 'present' ? '#388e3c' : '#bdbdbd', fontSize: 11 }}>{initials(s.name)}</Avatar>}
                            label={s.name}
                            color={s.status === 'present' ? 'success' : 'default'}
                            variant={s.status === 'present' ? 'filled' : 'outlined'}
                            onClick={() => toggleManualStatus(s.id)}
                            clickable
                          />
                        ))}
                      </Box>
                      <Button variant="contained" onClick={saveManual}
                        disabled={manualStudents.length === 0 || manualSaving}
                        sx={{ bgcolor: '#1976d2' }}>
                        {manualSaving ? <CircularProgress size={20} color="inherit" /> : 'Save Attendance'}
                      </Button>
                    </>
                  )}
                </Grid>
              )}
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Manual class selector (Case C) */}
      <ManualClassDialog
        open={manualClassDialog}
        classes={classes}
        title="Class manually තෝරන්න"
        onSelect={(cid) => {
          setManualClassDialog(false);
          handleClassSelectFromPopup(cid);
        }}
        onClose={() => setManualClassDialog(false)}
      />

      {/* Unknown QR modal (Case E) */}
      <UnknownQRModal
        open={modal?.type === 'unknown_qr'}
        qrData={pendingQrRef.current}
        classes={classes}
        onSuccess={(data) => { addToLog(data); showPopup('success', data); }}
        onClose={() => setModal(null)}
      />

      {/* Not enrolled modal (Case F) */}
      <NotEnrolledModal
        open={modal?.type === 'not_enrolled'}
        data={modal?.data || {}}
        classes={classes}
        onSuccess={(data) => { addToLog(data); showPopup('success', data); }}
        onClose={() => setModal(null)}
      />
    </Box>
  );
};

export default Attendance;
