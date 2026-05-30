import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tabs, Tab, Table, TableHead, TableRow,
  TableCell, TableBody, Avatar, LinearProgress, Tooltip,
} from '@mui/material';
import {
  Assessment, EventNote, Payments as PaymentsIcon,
  Quiz, EmojiEvents,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import API from '../../services/api';
import { ResultsDialog } from './ClassExams';

// ── helpers ───────────────────────────────────────────────────────────────────

const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmtAmt       = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;
const pct          = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

const AttendanceBar = ({ value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
    <LinearProgress
      variant="determinate"
      value={value}
      color={value >= 75 ? 'success' : value >= 50 ? 'warning' : 'error'}
      sx={{ flex: 1, height: 6, borderRadius: 3 }}
    />
    <Typography variant="caption" sx={{ width: 34, textAlign: 'right' }}>
      {value}%
    </Typography>
  </Box>
);

// ── Tab 0: Attendance ─────────────────────────────────────────────────────────

const AttendanceTab = ({ classData }) => {
  const [month, setMonth]       = useState(currentMonth());
  const [rows, setRows]         = useState([]);
  const [sessions, setSessions] = useState(0);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(() => {
    if (!classData) return;
    setLoading(true);
    API.get(`/teacher/classes/${classData.id}/report/attendance`, { params: { month } })
      .then((res) => { setRows(res.data.data); setSessions(res.data.total_sessions); })
      .catch(() => toast.error('Failed to load attendance.'))
      .finally(() => setLoading(false));
  }, [classData, month]);

  useEffect(() => { load(); }, [load]);

  const classAvg = rows.length
    ? Math.round(rows.reduce((s, r) => s + pct(Number(r.present_count) + Number(r.late_count), Number(r.total_marked) || 1), 0) / rows.length)
    : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          type="month"
          size="small"
          label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        {!loading && rows.length > 0 && (
          <>
            <Chip label={`${sessions} sessions recorded`} size="small" variant="outlined" icon={<EventNote sx={{ fontSize: '14px !important' }} />} />
            <Chip
              label={`Class avg: ${classAvg}%`}
              size="small"
              color={classAvg >= 75 ? 'success' : classAvg >= 50 ? 'warning' : 'error'}
            />
          </>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <EventNote sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {sessions === 0
              ? 'No attendance recorded for this month.'
              : 'No enrolled students.'}
          </Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Present</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Late</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Absent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Attendance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const present = Number(r.present_count);
                const late    = Number(r.late_count);
                const absent  = Number(r.absent_count);
                const total   = Number(r.total_marked) || 1;
                const rate    = pct(present + late, total);
                return (
                  <TableRow key={r.student_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1976d2' }}>
                          {r.student_name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{r.student_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.student_no || '—'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={present} size="small" color="success" variant={present > 0 ? 'filled' : 'outlined'} sx={{ minWidth: 32 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={late} size="small" color="warning" variant={late > 0 ? 'filled' : 'outlined'} sx={{ minWidth: 32 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={absent} size="small" color="error" variant={absent > 0 ? 'filled' : 'outlined'} sx={{ minWidth: 32 }} />
                    </TableCell>
                    <TableCell>
                      <AttendanceBar value={rate} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

// ── Tab 1: Payments ───────────────────────────────────────────────────────────

const STATUS_COLOR = { paid: 'success', pending: 'warning', overdue: 'error' };

const PaymentsTab = ({ classData }) => {
  const [month, setMonth]       = useState(currentMonth());
  const [payments, setPayments] = useState([]);
  const [summary, setSummary]   = useState({});
  const [loading, setLoading]   = useState(false);

  const load = useCallback(() => {
    if (!classData) return;
    setLoading(true);
    API.get(`/payments/class/${classData.id}`, { params: { month } })
      .then((res) => { setPayments(res.data.data); setSummary(res.data.summary || {}); })
      .catch(() => toast.error('Failed to load payments.'))
      .finally(() => setLoading(false));
  }, [classData, month]);

  useEffect(() => { load(); }, [load]);

  const paid    = Number(summary.paid    || 0);
  const pending = Number(summary.pending || 0);
  const overdue = Number(summary.overdue || 0);
  const total   = paid + pending + overdue;
  const collectionRate = pct(paid, total);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          type="month"
          size="small"
          label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        {!loading && total > 0 && (
          <Chip
            label={`Collection rate: ${collectionRate}%`}
            size="small"
            color={collectionRate >= 80 ? 'success' : collectionRate >= 50 ? 'warning' : 'error'}
          />
        )}
      </Box>

      {/* Summary cards */}
      {!loading && total > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Paper sx={{ px: 2, py: 1.2, borderLeft: '4px solid #388e3c', flex: 1, minWidth: 130 }}>
            <Typography variant="h6" color="success.main" fontWeight={700}>
              {fmtAmt(summary.paid_amount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">Collected ({paid})</Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1.2, borderLeft: '4px solid #f57c00', flex: 1, minWidth: 130 }}>
            <Typography variant="h6" color="warning.main" fontWeight={700}>
              {fmtAmt(summary.pending_amount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">Pending ({pending})</Typography>
          </Paper>
          {overdue > 0 && (
            <Paper sx={{ px: 2, py: 1.2, borderLeft: '4px solid #d32f2f', flex: 1, minWidth: 130 }}>
              <Typography variant="h6" color="error.main" fontWeight={700}>
                {fmtAmt(summary.overdue_amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Overdue ({overdue})</Typography>
            </Paper>
          )}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : payments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <PaymentsIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No payment records for {month}.</Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Paid On</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Receipt</TableCell>
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
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{fmtAmt(p.amount)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={p.status} color={STATUS_COLOR[p.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{p.receipt_no || '—'}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

// ── Tab 2: Exams ──────────────────────────────────────────────────────────────

const ExamsTab = ({ classData }) => {
  const [exams, setExams]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [resultsExam, setResultsExam] = useState(null);

  useEffect(() => {
    if (!classData) return;
    setLoading(true);
    API.get(`/exams/class/${classData.id}`)
      .then((res) => setExams(res.data.data))
      .catch(() => toast.error('Failed to load exams.'))
      .finally(() => setLoading(false));
  }, [classData]);

  return (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : exams.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Quiz sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No exams created for this class.</Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Exam</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Qs</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Marks</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Submissions</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Avg Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Pass Rate</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {exams.map((e) => {
                const submitted  = Number(e.result_count   ?? 0);
                const avgPct     = Number(e.avg_percentage ?? 0);
                const passCount  = Number(e.pass_count     ?? 0);
                const passRate   = submitted > 0 ? pct(passCount, submitted) : 0;

                return (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{e.title}</Typography>
                      {e.description && (
                        <Typography variant="caption" color="text.secondary">{e.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{Number(e.question_count)}</TableCell>
                    <TableCell align="center">{Number(e.total_marks)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={submitted}
                        size="small"
                        color={submitted > 0 ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {submitted > 0 ? (
                        <Chip
                          label={`${avgPct.toFixed(1)}%`}
                          size="small"
                          color={avgPct >= 50 ? 'success' : 'error'}
                        />
                      ) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      {submitted > 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <AttendanceBar value={passRate} />
                        </Box>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={e.is_published ? 'Published' : 'Draft'}
                        size="small"
                        color={e.is_published ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {submitted > 0 && (
                        <Tooltip title="View Results">
                          <Button
                            size="small"
                            startIcon={<EmojiEvents sx={{ fontSize: 14 }} />}
                            onClick={() => setResultsExam(e)}
                            sx={{ fontSize: 11, py: 0.3, px: 1 }}
                          >
                            Results
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <ResultsDialog
        open={!!resultsExam}
        onClose={() => setResultsExam(null)}
        exam={resultsExam}
      />
    </Box>
  );
};

// ── Reports Dialog ────────────────────────────────────────────────────────────

const ReportsDialog = ({ open, onClose, classData }) => {
  const [tab, setTab] = useState(0);

  useEffect(() => { if (open) setTab(0); }, [open]);

  const tabs = [
    { label: 'Attendance', icon: <EventNote sx={{ fontSize: 16 }} /> },
    { label: 'Payments',   icon: <PaymentsIcon sx={{ fontSize: 16 }} /> },
    { label: 'Exams',      icon: <Quiz sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          Reports
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={400}>
          {classData?.name}
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mt: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{ minHeight: 40, py: 0.5, fontSize: 13, textTransform: 'none' }}
            />
          ))}
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pt: '16px !important' }}>
        {tab === 0 && <AttendanceTab classData={classData} />}
        {tab === 1 && <PaymentsTab   classData={classData} />}
        {tab === 2 && <ExamsTab      classData={classData} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export { ReportsDialog };
