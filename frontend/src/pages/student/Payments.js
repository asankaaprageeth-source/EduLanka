import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress } from '@mui/material';
import API from '../../services/api';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/payments/student')
      .then((res) => setPayments(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = { paid: 'success', pending: 'warning', overdue: 'error' };
  const pending = payments.filter((p) => p.status !== 'paid');
  const totalPending = pending.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>My Payments</Typography>

      {pending.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0', borderLeft: '4px solid #f57c00', borderRadius: 2 }}>
          <Typography color="warning.dark" fontWeight={600}>
            Pending: Rs. {totalPending.toLocaleString()} — {pending.length} unpaid record(s)
          </Typography>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box> : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Month</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Paid On</TableCell>
                <TableCell>Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} hover sx={{ bgcolor: p.status === 'overdue' ? '#fff5f5' : 'inherit' }}>
                  <TableCell>{p.class_name}</TableCell>
                  <TableCell>{p.month}</TableCell>
                  <TableCell align="right">Rs. {Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell><Chip label={p.status} color={statusColor[p.status]} size="small" /></TableCell>
                  <TableCell>{p.paid_date || '—'}</TableCell>
                  <TableCell><Typography variant="caption">{p.receipt_no || '—'}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Payments;
