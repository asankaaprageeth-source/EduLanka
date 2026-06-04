import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Avatar, Chip,
  List, ListItem, ListItemText,
  Checkbox, Divider, Alert, CircularProgress, Tabs, Tab,
  IconButton, Paper
} from '@mui/material';
import { QrCodeScanner, Search, PersonSearch, CheckCircle, School } from '@mui/icons-material';
import API from '../services/api';
import toast from 'react-hot-toast';

const QrStudentEnrollModal = ({ open, onClose }) => {
  const [tab, setTab] = useState(0); // 0=QR, 1=ID search
  const [query, setQuery] = useState('');
  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (open) loadClasses();
    else resetAll();
  }, [open]);

  const resetAll = () => {
    setQuery(''); setStudent(null); setSelected([]);
    setError(''); setScanning(false); stopScanner();
  };

  const loadClasses = async () => {
    try {
      const res = await API.get('/enrollment/available-classes');
      setClasses(res.data.data);
    } catch { toast.error('Failed to load classes.'); }
  };

  const findStudent = async (q) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true); setError(''); setStudent(null); setSelected([]);
    try {
      const res = await API.post('/enrollment/find-student', { query: searchQuery.trim() });
      setStudent(res.data.data);
      // Pre-select classes student is NOT already in
      const enrolledIds = res.data.data.enrollments.map(e => e.class_id);
      setSelected(classes.filter(c => !enrolledIds.includes(c.id)).map(c => c.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Student not found.');
    } finally { setLoading(false); }
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      scannerRef.current = reader;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      reader.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          stopScanner();
          setQuery(text);
          findStudent(text);
        }
      });
    } catch (err) {
      setScanning(false);
      toast.error('Camera not available. Use Student ID instead.');
      setTab(1);
    }
  };

  const stopScanner = () => {
    try {
      if (scannerRef.current) { scannerRef.current.reset?.(); scannerRef.current = null; }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch {}
    setScanning(false);
  };

  const toggleClass = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleEnroll = async () => {
    if (!student || selected.length === 0) return;
    setEnrolling(true);
    let successCount = 0;
    for (const class_id of selected) {
      try {
        await API.post('/enrollment/enroll', { student_id: student.id, class_id });
        successCount++;
      } catch (err) {
        toast.error(`${classes.find(c=>c.id===class_id)?.name}: ${err.response?.data?.message || 'Failed'}`);
      }
    }
    setEnrolling(false);
    if (successCount > 0) {
      toast.success(`✅ Enrolled in ${successCount} class${successCount>1?'es':''}!`);
      onClose();
    }
  };

  const enrolledIds = student?.enrollments?.map(e => e.class_id) || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <School color="primary" /> Enroll Student to Class
      </DialogTitle>
      <DialogContent>

        {/* Step 1: Find Student */}
        <Typography variant="subtitle2" color="text.secondary" mb={1}>Step 1: Find Student</Typography>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); stopScanner(); }} sx={{ mb: 2 }}>
          <Tab icon={<QrCodeScanner />} label="QR Scan" iconPosition="start" />
          <Tab icon={<PersonSearch />} label="Student ID" iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <Box>
            {!scanning ? (
              <Button fullWidth variant="outlined" startIcon={<QrCodeScanner />}
                onClick={startScanner} sx={{ py: 2, borderStyle: 'dashed' }}>
                Click to Start QR Scanner
              </Button>
            ) : (
              <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: 240, display: 'block' }} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Box sx={{ width: 160, height: 160, border: '3px solid #1976d2', borderRadius: 2, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                </Box>
                <Button size="small" onClick={stopScanner}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField fullWidth size="small" placeholder="Enter Student ID (e.g. STU1234567890)"
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && findStudent()} />
            <Button variant="contained" onClick={() => findStudent()} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <Search />}
            </Button>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Student Card */}
        {student && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: '#f8f9fa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={student.photo ? `${process.env.REACT_APP_API_URL}/uploads/${student.photo}` : undefined}
                sx={{ width: 52, height: 52, bgcolor: '#388e3c20', color: '#388e3c', fontSize: 20 }}>
                {student.name?.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>{student.name}</Typography>
                <Typography variant="body2" color="text.secondary">{student.student_id}</Typography>
                {student.email && <Typography variant="body2" color="text.secondary">{student.email}</Typography>}
              </Box>
              <CheckCircle color="success" />
            </Box>
            {student.enrollments?.length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">Already enrolled in: </Typography>
                {student.enrollments.map(e => <Chip key={e.class_id} label={e.class?.name} size="small" sx={{ ml: 0.5 }} />)}
              </Box>
            )}
          </Paper>
        )}

        {/* Step 2: Select Classes */}
        {student && classes.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Step 2: Select Classes to Enroll
            </Typography>
            <List dense sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
              {classes.map(cls => {
                const alreadyIn = enrolledIds.includes(cls.id);
                return (
                  <ListItem key={cls.id} button onClick={() => !alreadyIn && toggleClass(cls.id)}
                    sx={{ opacity: alreadyIn ? 0.5 : 1 }}>
                    <Checkbox checked={alreadyIn || selected.includes(cls.id)} disabled={alreadyIn} size="small" sx={{ mr: 1 }} />
                    <ListItemText
                      primary={cls.name}
                      secondary={`${cls.subject || ''} ${cls.class_day ? '| ' + cls.class_day : ''} ${cls.start_time || ''} | Rs.${cls.monthly_fee}/mo | ${cls._count?.enrollments || 0} students`}
                    />
                    {alreadyIn && <Chip label="Enrolled" size="small" color="success" variant="outlined" />}
                  </ListItem>
                );
              })}
            </List>
            {selected.length > 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {selected.length} class{selected.length > 1 ? 'es' : ''} selected for enrollment
              </Alert>
            )}
          </>
        )}

        {student && classes.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>No active classes found. Please create classes first.</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success"
          onClick={handleEnroll}
          disabled={!student || selected.length === 0 || enrolling}
          startIcon={enrolling ? <CircularProgress size={18} /> : <CheckCircle />}>
          {enrolling ? 'Enrolling...' : `Enroll in ${selected.length} Class${selected.length !== 1 ? 'es' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QrStudentEnrollModal;
