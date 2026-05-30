import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, TextField, MenuItem, Tabs, Tab,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import API from '../../services/api';

const TeacherReports = () => {
  const [tab, setTab] = useState(0);
  const [classes, setClasses] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [classId, setClassId] = useState('');

  const [attendance, setAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    API.get('/teacher/classes')
      .then((res) => setClasses(res.data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (tab === 0) {
      setAttLoading(true);
      const params = {};
      if (month) params.month = month;
      if (classId) params.class_id = classId;
      API.get('/teacher/reports/attendance', { params })
        .then((res) => setAttendance(res.data.data || []))
        .catch(console.error)
        .finally(() => setAttLoading(false));
    } else {
      setPayLoading(true);
      const params = {};
      if (month) params.month = month;
      if (classId) params.class_id = classId;
      API.get('/teacher/reports/payments', { params })
        .then((res) => setPayments(res.data.data || []))
        .catch(console.error)
        .finally(() => setPayLoading(false));
    }
  }, [tab, month, classId]);

  const attPresent = attendance.filter((r) => r.status === 'present').length;
  const attAbsent  = attendance.filter((r) => r.status === 'absent').length;
  const attRate    = attendance.length ? Math.round((attPresent / attendance.length) * 100) : null;

  const payCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const payPending   = payments.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);

  const filters = (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      <TextField
        label="Month" type="month" value={month}
        onChange={(e) => setMonth(e.target.value)}
        InputLabelProps={{ shrink: true }} sx={{ minWidth: 180 }}
      />
      <TextField
        select label="Class" value={classId}
        onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 220 }}
      >
        <MenuItem value="">All Classes</MenuItem>
        {classes.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </TextField>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Reports</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Attendance Report" />
        <Tab label="Payment Report" />
      </Tabs>

      {filters}

      {tab === 0 && (
        <>
          {!attLoading && attendance.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #388e3c', minWidth: 120 }}>
                <Typography variant="h5" fontWeight={700} color="success.main">{attPresent}</Typography>
                <Typography variant="body2" color="text.secondary">Present</Typography>
              </Paper>
              <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #d32f2f', minWidth: 120 }}>
                <Typography variant="h5" fontWeight={700} color="error.main">{attAbsent}</Typography>
                <Typography variant="body2" color="text.secondary">Absent</Typography>
              </Paper>
              {attRate !== null && (
                <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: `4px solid ${attRate >= 75 ? '#388e3c' : '#f57c00'}`, minWidth: 120 }}>
                  <Typography variant="h5" fontWeight={700} color={attRate >= 75 ? 'success.main' : 'warning.main'}>{attRate}%</Typography>
                  <Typography variant="body2" color="text.secondary">Rate</Typography>
                </Paper>
              )}
            </Box>
          )}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {attLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : attendance.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No records found.</Typography></Box>
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
                  {attendance.map((r, i) => (
                    <TableRow key={i} hover sx={{ bgcolor: r.status === 'absent' ? '#fff5f5' : 'inherit' }}>
                      <TableCell>{new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell>{r.student_name}</TableCell>
                      <TableCell>{r.class_name}</TableCell>
                      <TableCell>
                        <Chip
                          icon={r.status === 'present' ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                          label={r.status === 'present' ? 'Present' : 'Absent'}
                          color={r.status === 'present' ? 'success' : 'error'}
                          size="small" variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}

      {tab === 1 && (
        <>
          {!payLoading && payments.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #388e3c', minWidth: 160 }}>
                <Typography variant="h6" fontWeight={700} color="success.main">Rs. {payCollected.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Collected</Typography>
              </Paper>
              <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #d32f2f', minWidth: 160 }}>
                <Typography variant="h6" fontWeight={700} color="error.main">Rs. {payPending.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
              </Paper>
            </Box>
          )}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {payLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : payments.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No records found.</Typography></Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Paid On</TableCell>
                    <TableCell>Receipt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((p, i) => (
                    <TableRow key={i} hover sx={{ bgcolor: p.status === 'overdue' ? '#fff5f5' : 'inherit' }}>
                      <TableCell>{p.student_name}</TableCell>
                      <TableCell>{p.class_name}</TableCell>
                      <TableCell>{p.month}</TableCell>
                      <TableCell align="right">Rs. {Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={p.status} color={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'error' : 'warning'} size="small" />
                      </TableCell>
                      <TableCell>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                      <TableCell><Typography variant="caption">{p.receipt_no || '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default TeacherReports;
