import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Select, MenuItem, FormControl, InputLabel,
  Button, Grid, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField
} from '@mui/material';
import { Add } from '@mui/icons-material';
import API from '../../services/api';
import toast from 'react-hot-toast';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [payForm, setPayForm] = useState({ student_id: '', class_id: '', amount: '', month, notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (month) params.month = month;
      if (selectedClass) params.class_id = selectedClass;
      const res = await API.get('/institute/reports/income', { params });
      setPayments(res.data.data);
      setSummary(res.data.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.get('/institute/classes').then((res) => setClasses(res.data.data));
  }, []);

  useEffect(() => { load(); }, [month, selectedClass]);

  const handleRecord = async () => {
    try {
      await API.post('/payments/record', payForm);
      toast.success('Payment recorded!');
      setOpenDialog(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const statusColor = { paid: 'success', pending: 'warning', overdue: 'error' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Fee Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Record Payment
        </Button>
      </Box>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', borderLeft: '4px solid #388e3c' }}>
              <Typography variant="h6" color="success.main">Rs. {Number(summary.total_collected).toLocaleString()}</Typography>
              <Typography variant="caption">Collected ({summary.paid_count})</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', borderLeft: '4px solid #d32f2f' }}>
              <Typography variant="h6" color="error.main">Rs. {Number(summary.total_pending).toLocaleString()}</Typography>
              <Typography variant="caption">Pending ({summary.pending_count})</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)}
          size="small" InputLabelProps={{ shrink: true }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Class</InputLabel>
          <Select value={selectedClass} label="Class" onChange={(e) => setSelectedClass(e.target.value)}>
            <MenuItem value="">All Classes</MenuItem>
            {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box> : (
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Month</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.student_name}</TableCell>
                  <TableCell>{p.class_name}</TableCell>
                  <TableCell>{p.month}</TableCell>
                  <TableCell align="right">Rs. {Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell><Chip label={p.status} color={statusColor[p.status]} size="small" /></TableCell>
                  <TableCell><Typography variant="caption">{p.receipt_no || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Class</InputLabel>
                <Select value={payForm.class_id} label="Class" onChange={(e) => setPayForm({ ...payForm, class_id: e.target.value })}>
                  {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Amount (Rs)" type="number" value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="month" label="Month" value={payForm.month}
                onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleRecord} variant="contained">Save Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Payments;
