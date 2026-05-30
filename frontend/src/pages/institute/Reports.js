import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, TextField, MenuItem, Tabs, Tab,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import API from '../../services/api';

const InstituteReports = () => {
  const [tab, setTab] = useState(0);
  const [classes, setClasses] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [classId, setClassId] = useState('');

  // Attendance
  const [attendance, setAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(false);

  // Income
  const [income, setIncome] = useState([]);
  const [summary, setSummary] = useState(null);
  const [incLoading, setIncLoading] = useState(false);

  useEffect(() => {
    API.get('/institute/classes')
      .then((res) => setClasses(res.data.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (tab === 0) {
      setAttLoading(true);
      const params = {};
      if (month) params.month = month;
      if (classId) params.class_id = classId;
      API.get('/institute/reports/attendance', { params })
        .then((res) => setAttendance(res.data.data || []))
        .catch(console.error)
        .finally(() => setAttLoading(false));
    } else {
      setIncLoading(true);
      const params = {};
      if (month) params.month = month;
      if (classId) params.class_id = classId;
      API.get('/institute/reports/income', { params })
        .then((res) => {
          setIncome(res.data.data || []);
          setSummary(res.data.summary || null);
        })
        .catch(console.error)
        .finally(() => setIncLoading(false));
    }
  }, [tab, month, classId]);

  const filters = (
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
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Reports</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Attendance Report" />
        <Tab label="Income Report" />
      </Tabs>

      {filters}

      {tab === 0 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {attLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : attendance.length === 0 ? (
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
                {attendance.map((r, i) => (
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
      )}

      {tab === 1 && (
        <>
          {summary && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #388e3c', minWidth: 160 }}>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  Rs. {Number(summary.total_collected).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">Collected ({summary.paid_count})</Typography>
              </Paper>
              <Paper sx={{ px: 3, py: 2, borderRadius: 2, borderLeft: '4px solid #d32f2f', minWidth: 160 }}>
                <Typography variant="h6" fontWeight={700} color="error.main">
                  Rs. {Number(summary.total_pending).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">Pending ({summary.pending_count})</Typography>
              </Paper>
            </Box>
          )}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {incLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : income.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No payment records found.</Typography>
              </Box>
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
                  {income.map((p, i) => (
                    <TableRow key={i} hover sx={{ bgcolor: p.status === 'overdue' ? '#fff5f5' : 'inherit' }}>
                      <TableCell>{p.student_name}</TableCell>
                      <TableCell>{p.class_name}</TableCell>
                      <TableCell>{p.month}</TableCell>
                      <TableCell align="right">Rs. {Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.status}
                          color={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </TableCell>
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

export default InstituteReports;
