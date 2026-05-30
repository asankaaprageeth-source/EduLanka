import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, TextField, MenuItem,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import API from '../../services/api';

const TeacherAttendance = () => {
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [classId, setClassId] = useState('');

  useEffect(() => {
    API.get('/teacher/classes')
      .then((res) => setClasses(res.data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (month) params.month = month;
    if (classId) params.class_id = classId;
    API.get('/teacher/reports/attendance', { params })
      .then((res) => setRecords(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, classId]);

  const present = records.filter((r) => r.status === 'present').length;
  const absent  = records.filter((r) => r.status === 'absent').length;
  const rate    = records.length ? Math.round((present / records.length) * 100) : null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Attendance</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All Classes</MenuItem>
          {classes.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      {!loading && records.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #388e3c', minWidth: 120 }}>
            <Typography variant="h5" fontWeight={700} color="success.main">{present}</Typography>
            <Typography variant="body2" color="text.secondary">Present</Typography>
          </Paper>
          <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #d32f2f', minWidth: 120 }}>
            <Typography variant="h5" fontWeight={700} color="error.main">{absent}</Typography>
            <Typography variant="body2" color="text.secondary">Absent</Typography>
          </Paper>
          {rate !== null && (
            <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: `4px solid ${rate >= 75 ? '#388e3c' : '#f57c00'}`, minWidth: 120 }}>
              <Typography variant="h5" fontWeight={700} color={rate >= 75 ? 'success.main' : 'warning.main'}>{rate}%</Typography>
              <Typography variant="body2" color="text.secondary">Attendance Rate</Typography>
            </Paper>
          )}
        </Box>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : records.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No attendance records found.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r, i) => (
                <TableRow key={i} hover sx={{ bgcolor: r.status === 'absent' ? '#fff5f5' : 'inherit' }}>
                  <TableCell>
                    {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>{r.student_name}</TableCell>
                  <TableCell>{r.class_name}</TableCell>
                  <TableCell>
                    <Chip
                      icon={r.status === 'present' ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                      label={r.status === 'present' ? 'Present' : 'Absent'}
                      color={r.status === 'present' ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default TeacherAttendance;
