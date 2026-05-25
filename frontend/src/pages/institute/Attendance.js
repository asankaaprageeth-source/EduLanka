import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Select, MenuItem, FormControl,
  InputLabel, Button, Chip, CircularProgress, Alert, Divider
} from '@mui/material';
import { QrCodeScanner, CheckCircle } from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import API from '../../services/api';
import toast from 'react-hot-toast';

const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [manualStudents, setManualStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    API.get('/institute/classes').then((res) => setClasses(res.data.data));
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); };
  }, []);

  const loadStudents = async (classId) => {
    setLoadingStudents(true);
    try {
      const res = await API.get(`/attendance/class/${classId}/students`);
      setManualStudents(res.data.data.map((s) => ({ ...s, status: s.today_status || 'absent' })));
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClassChange = (val) => {
    setSelectedClass(val);
    if (val) loadStudents(val);
  };

  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 });
      scanner.render(
        async (text) => {
          try {
            const res = await API.post('/attendance/qr', { qr_data: text, class_id: selectedClass });
            setLastScan(res.data.data);
            toast.success(`${res.data.data.student.name} - Attendance marked!`);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Scan failed');
          }
        },
        (err) => {}
      );
      scannerRef.current = scanner;
    }, 300);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const toggleStatus = (id) => {
    setManualStudents((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s)
    );
  };

  const saveManual = async () => {
    try {
      await API.post('/attendance/manual', {
        class_id: selectedClass,
        date: new Date().toISOString().split('T')[0],
        attendance_list: manualStudents.map((s) => ({ student_id: s.id, status: s.status })),
      });
      toast.success('Attendance saved!');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Attendance Management</Typography>

      <FormControl sx={{ mb: 3, minWidth: 250 }}>
        <InputLabel>Select Class</InputLabel>
        <Select value={selectedClass} label="Select Class" onChange={(e) => handleClassChange(e.target.value)}>
          {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </Select>
      </FormControl>

      {selectedClass && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
                QR Scanner
              </Typography>
              {!scanning ? (
                <Button fullWidth variant="contained" startIcon={<QrCodeScanner />} onClick={startScanner} sx={{ py: 1.5 }}>
                  Start QR Scanner
                </Button>
              ) : (
                <>
                  <div id="qr-reader" style={{ width: '100%' }} />
                  <Button fullWidth variant="outlined" color="error" onClick={stopScanner} sx={{ mt: 2 }}>
                    Stop Scanner
                  </Button>
                </>
              )}
              {lastScan && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2 }}>
                  <strong>{lastScan.student.name}</strong> marked present
                </Alert>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>Manual Attendance</Typography>
                <Button variant="contained" onClick={saveManual} disabled={manualStudents.length === 0}>
                  Save
                </Button>
              </Box>
              {loadingStudents ? (
                <CircularProgress />
              ) : (
                manualStudents.map((s) => (
                  <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Typography>{s.name}</Typography>
                    <Chip
                      label={s.status === 'present' ? 'Present' : 'Absent'}
                      color={s.status === 'present' ? 'success' : 'default'}
                      onClick={() => toggleStatus(s.id)}
                      clickable
                    />
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Attendance;
