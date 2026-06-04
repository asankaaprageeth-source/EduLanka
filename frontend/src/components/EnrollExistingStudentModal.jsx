import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Avatar, Chip, List, ListItem, ListItemText,
  ListItemAvatar, Checkbox, Alert, CircularProgress, Tabs, Tab,
  TextField, InputAdornment, Divider, Paper, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  QrCodeScanner, Search, People, CheckCircle, School,
  PersonSearch, FilterList
} from '@mui/icons-material';
import API from '../services/api';
import toast from 'react-hot-toast';

const EnrollExistingStudentModal = ({ open, onClose, preClassId }) => {
  const [tab, setTab] = useState(0); // 0=Browse list, 1=QR Scan, 2=Search ID
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(preClassId || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null);
  const [idQuery, setIdQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadClasses();
      if (preClassId) setSelectedClass(preClassId);
    } else {
      resetAll();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClass) loadUnenrolled();
  }, [selectedClass]);

  const resetAll = () => {
    setSelectedStudents([]); setScannedStudent(null);
    setSearch(''); setIdQuery(''); setScanning(false);
    setStudents([]); stopScanner();
    setSelectedClass(preClassId || '');
  };

  const loadClasses = async () => {
    try {
      const res = await API.get('/enrollment/available-classes');
      setClasses(res.data.data);
    } catch { toast.error('Failed to load classes.'); }
  };

  const loadUnenrolled = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await API.get(`/enrollment/unenrolled-students?class_id=${selectedClass}`);
      setStudents(res.data.data);
    } catch { toast.error('Failed to load students.'); }
    finally { setLoading(false); }
  };

  const findByIdOrQR = async (query) => {
    if (!query?.trim()) return;
    setSearchLoading(true);
    try {
      const res = await API.post('/enrollment/find-student', { query: query.trim() });
      setScannedStudent(res.data.data);
      if (!selectedStudents.includes(res.data.data.id)) {
        setSelectedStudents(prev => [...prev, res.data.data.id]);
      }
      toast.success(`Found: ${res.data.data.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Student not found.');
    } finally { setSearchLoading(false); }
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
          findByIdOrQR(text);
        }
      });
    } catch {
      setScanning(false);
      toast.error('Camera not available.');
      setTab(2);
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

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedStudents(filteredStudents.map(s => s.id));
  };

  const handleEnroll = async () => {
    if (!selectedClass || selectedStudents.length === 0) return;
    setEnrolling(true);
    let successCount = 0;
    for (const student_id of selectedStudents) {
      try {
        await API.post('/enrollment/enroll', { student_id, class_id: parseInt(selectedClass) });
        successCount++;
      } catch (err) {
        const s = students.find(x => x.id === student_id) || scannedStudent;
        toast.error(`${s?.name || student_id}: ${err.response?.data?.message || 'Failed'}`);
      }
    }
    setEnrolling(false);
    if (successCount > 0) {
      toast.success(`✅ ${successCount} student${successCount > 1 ? 's' : ''} enrolled successfully!`);
      onClose();
    }
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClassName = classes.find(c => c.id === parseInt(selectedClass))?.name;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <People color="primary" /> Enroll Existing Students to Class
      </DialogTitle>

      <DialogContent>
        {/* Class Selector */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Class *</InputLabel>
          <Select
            value={selectedClass}
            label="Select Class *"
            onChange={e => { setSelectedClass(e.target.value); setSelectedStudents([]); }}
          >
            {classes.map(c => (
              <MenuItem key={c.id} value={c.id}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.subject} {c.class_day ? `| ${c.class_day}` : ''} {c.start_time || ''} | {c._count?.enrollments || 0} students
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedClass && (
          <>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); stopScanner(); setScannedStudent(null); }} sx={{ mb: 2 }}>
              <Tab icon={<People />} label={`Browse (${students.length})`} iconPosition="start" />
              <Tab icon={<QrCodeScanner />} label="QR Scan" iconPosition="start" />
              <Tab icon={<PersonSearch />} label="Student ID" iconPosition="start" />
            </Tabs>

            {/* Tab 0: Browse list */}
            {tab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    size="small" placeholder="Search by name, ID or email..."
                    value={search} onChange={e => setSearch(e.target.value)} fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                  />
                  <Tooltip title="Select all visible">
                    <Button size="small" onClick={selectAll} disabled={filteredStudents.length === 0}>All</Button>
                  </Tooltip>
                  <Button size="small" onClick={() => setSelectedStudents([])}>Clear</Button>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : filteredStudents.length === 0 ? (
                  <Alert severity="info">
                    {students.length === 0
                      ? 'All students in this institute are already enrolled in this class, or no students found.'
                      : 'No students match your search.'}
                  </Alert>
                ) : (
                  <List dense sx={{ border: '1px solid #e0e0e0', borderRadius: 1, maxHeight: 320, overflow: 'auto' }}>
                    {filteredStudents.map(s => (
                      <ListItem key={s.id} button onClick={() => toggleStudent(s.id)}
                        sx={{ bgcolor: selectedStudents.includes(s.id) ? '#e8f5e920' : 'transparent' }}>
                        <Checkbox checked={selectedStudents.includes(s.id)} size="small" sx={{ mr: 1 }} />
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#388e3c20', color: '#388e3c', fontSize: 13 }}>
                            {s.name?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{s.name}</Typography>}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">{s.student_id}</Typography>
                              {s.email && <Typography variant="caption" color="text.secondary"> | {s.email}</Typography>}
                              {s.enrollments?.length > 0 && (
                                <Box mt={0.3}>
                                  {s.enrollments.map(e => (
                                    <Chip key={e.class_id} label={e.class?.name} size="small"
                                      sx={{ mr: 0.5, fontSize: 10, height: 18 }} variant="outlined" />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        {selectedStudents.includes(s.id) && <CheckCircle color="success" fontSize="small" />}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Tab 1: QR Scan */}
            {tab === 1 && (
              <Box>
                {!scanning ? (
                  <Button fullWidth variant="outlined" startIcon={<QrCodeScanner />}
                    onClick={startScanner} sx={{ py: 3, borderStyle: 'dashed', mb: 2 }}>
                    Click to Start QR Scanner
                  </Button>
                ) : (
                  <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: '#000', mb: 2 }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: 260, display: 'block' }} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <Box sx={{ width: 180, height: 180, border: '3px solid #1976d2', borderRadius: 2,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                    </Box>
                    <Button size="small" onClick={stopScanner}
                      sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white' }}>
                      Cancel
                    </Button>
                    <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, left: 0, right: 0,
                      textAlign: 'center', color: 'white' }}>
                      Point camera at student QR code
                    </Typography>
                  </Box>
                )}
                {scannedStudent && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f1f8e9' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#388e3c20', color: '#388e3c' }}>{scannedStudent.name?.charAt(0)}</Avatar>
                      <Box>
                        <Typography fontWeight={700}>{scannedStudent.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{scannedStudent.student_id}</Typography>
                      </Box>
                      <CheckCircle color="success" sx={{ ml: 'auto' }} />
                    </Box>
                    <Typography variant="caption" color="success.main" mt={1} display="block">✅ Added to enrollment list</Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Tab 2: Student ID search */}
            {tab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField fullWidth size="small"
                    placeholder="Enter Student ID (e.g. STU1234567890)"
                    value={idQuery} onChange={e => setIdQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && findByIdOrQR(idQuery)} />
                  <Button variant="contained" onClick={() => findByIdOrQR(idQuery)} disabled={searchLoading}>
                    {searchLoading ? <CircularProgress size={20} /> : <Search />}
                  </Button>
                </Box>
                {scannedStudent && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f1f8e9' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#388e3c20', color: '#388e3c' }}>{scannedStudent.name?.charAt(0)}</Avatar>
                      <Box>
                        <Typography fontWeight={700}>{scannedStudent.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{scannedStudent.student_id}</Typography>
                        {scannedStudent.email && <Typography variant="caption" color="text.secondary"> | {scannedStudent.email}</Typography>}
                      </Box>
                      <CheckCircle color="success" sx={{ ml: 'auto' }} />
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {selectedStudents.length > 0 && (
              <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
                <b>{selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''}</b> selected
                {selectedClassName && <> for <b>{selectedClassName}</b></>}
              </Alert>
            )}
          </>
        )}

        {!selectedClass && (
          <Alert severity="warning">Please select a class first.</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success"
          onClick={handleEnroll}
          disabled={!selectedClass || selectedStudents.length === 0 || enrolling}
          startIcon={enrolling ? <CircularProgress size={18} /> : <CheckCircle />}>
          {enrolling ? 'Enrolling...' : `Enroll ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnrollExistingStudentModal;
