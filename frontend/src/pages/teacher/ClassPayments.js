import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Avatar,
} from '@mui/material';
import { Payments as PaymentsIcon, CheckCircle, Autorenew } from '@mui/icons-material';
import toast from 'react-hot-toast';
import API from '../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR = { paid: 'success', pending: 'warning', overdue: 'error' };

const currentMonth = () => new Date().toISOString().slice(0, 7);

const fmtAmount = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;

// ── Mark Paid Dialog ──────────────────────────────────────────────────────────

const MarkPaidDialog = ({ open, onClose, payment, classData, onPaid }) => {
  const [amount, setAmount]   = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (open && payment) {
      setAmount(String(payment.amount || ''));
      setNotes('');
    }
  }, [open, payment]);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await API.post(`/payments/class/${classData.id}/record`, {
        student_id: payment.student_id,
        amount: Number(amount),
        month: payment.month,
        notes: notes.trim() || null,
      });
      toast.success(res.data.message || 'Payment recorded.');
      onPaid();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Mark as Paid</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {payment && (
          <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 1, p: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>{payment.student_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              Month: {payment.month}
            </Typography>
          </Box>
        )}
        <TextField
          label="Amount (Rs.)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputProps={{ min: 1 }}
          fullWidth
          required
        />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
        >
          {saving ? 'Saving…' : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Payments Dialog ───────────────────────────────────────────────────────────

const PaymentsDialog = ({ open, onClose, classData }) => {
  const [month, setMonth]           = useState(currentMonth());
  const [payments, setPayments]     = useState([]);
  const [summary, setSummary]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [markRow, setMarkRow]       = useState(null);

  const load = useCallback(() => {
    if (!classData) return;
    setLoading(true);
    API.get(`/payments/class/${classData.id}`, { params: { month } })
      .then((res) => { setPayments(res.data.data); setSummary(res.data.summary || {}); })
      .catch(() => toast.error('Failed to load payments.'))
      .finally(() => setLoading(false));
  }, [classData, month]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await API.post(`/payments/class/${classData.id}/generate`, { month });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate fees.');
    } finally {
      setGenerating(false);
    }
  };

  const paid    = Number(summary.paid    || 0);
  const pending = Number(summary.pending || 0);
  const overdue = Number(summary.overdue || 0);

  const paidAmt    = Number(summary.paid_amount    || 0);
  const pendingAmt = Number(summary.pending_amount || 0);
  const overdueAmt = Number(summary.overdue_amount || 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              Payments
              <Typography variant="body2" color="text.secondary" fontWeight={400}>
                {classData?.name}
                {classData?.monthly_fee > 0 && ` · ${fmtAmount(classData.monthly_fee)} / month`}
              </Typography>
            </Box>
            {/* Month picker + Generate */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                type="month"
                size="small"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 155 }}
              />
              <Tooltip title="Generate pending fee records for all enrolled students this month">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={generating ? <CircularProgress size={14} /> : <Autorenew />}
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    Generate Fees
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 2, pt: '4px !important' }}>
          {/* Summary cards */}
          {!loading && payments.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Paper sx={{ px: 2, py: 1.2, borderLeft: '4px solid #388e3c', flex: 1, minWidth: 140 }}>
                <Typography variant="h6" color="success.main" fontWeight={700}>{fmtAmount(paidAmt)}</Typography>
                <Typography variant="caption" color="text.secondary">Collected ({paid})</Typography>
              </Paper>
              <Paper sx={{ px: 2, py: 1.2, borderLeft: '4px solid #f57c00', flex: 1, minWidth: 140 }}>
                <Typography variant="h6" color="warning.main" fontWeight={700}>{fmtAmount(pendingAmt)}</Typography>
                <Typography variant="caption" color="text.secondary">Pending ({pending})</Typography>
              </Paper>
              {overdue > 0 && (
                <Paper sx={{ px: 2, py: 1.2, borderLeft: '4px solid #d32f2f', flex: 1, minWidth: 140 }}>
                  <Typography variant="h6" color="error.main" fontWeight={700}>{fmtAmount(overdueAmt)}</Typography>
                  <Typography variant="caption" color="text.secondary">Overdue ({overdue})</Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : payments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <PaymentsIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" gutterBottom>
                No payment records for {month}.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click "Generate Fees" to create pending records for all enrolled students.
              </Typography>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Paid On</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Receipt</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1976d2' }}>
                            {p.student_name?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{p.student_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.student_no || '—'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{p.month}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>{fmtAmount(p.amount)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={p.status}
                          color={STATUS_COLOR[p.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {p.receipt_no || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {p.status !== 'paid' && (
                          <Tooltip title="Mark as paid">
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => setMarkRow(p)}
                              sx={{ fontSize: 11, py: 0.3, px: 1 }}
                            >
                              Mark Paid
                            </Button>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      <MarkPaidDialog
        open={!!markRow}
        onClose={() => setMarkRow(null)}
        payment={markRow}
        classData={classData}
        onPaid={load}
      />
    </>
  );
};

export { PaymentsDialog };
