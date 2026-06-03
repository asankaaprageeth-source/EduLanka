import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Button, Chip,
  Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, IconButton, Skeleton, Badge, Tooltip,
} from '@mui/material';
import ProfilePicUpload from '../../components/ProfilePicUpload';
import {
  School, People, EventNote, Message, Business, Add, Search,
  CheckCircle, Close, Warning, LinkOff, Notifications, HourglassEmpty,
  NotificationsActive,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';

const SL_DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle',
  'Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle',
  'Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala',
  'Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura',
  'Trincomalee','Vavuniya',
];

function parseSubjects(raw) {
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

// ── Connection status chip ───────────────────────────────────────────────────
function ConnStatusChip({ status, requestedBy, role }) {
  if (status === 'accepted') return <Chip label="Connected ✓" color="success" size="small" />;
  if (status === 'pending') {
    if (requestedBy === role) return <Chip label="Pending... ⏳" sx={{ bgcolor: '#fff8e1', color: '#f57c00', border: '1px solid #f57c00' }} size="small" />;
    return <Chip label="Respond 🔔" sx={{ bgcolor: '#e3f2fd', color: '#1976d2', border: '1px solid #1976d2' }} size="small" />;
  }
  return null;
}

// ── Institute search result card ─────────────────────────────────────────────
const InstSearchCard = ({ inst, onRequest, onAccept, onReject, loading }) => {
  const cs = inst.connection_status;
  const rb = inst.requested_by;
  const isConnected = cs === 'accepted';
  const isSent = cs === 'pending' && rb === 'teacher';
  const isReceived = cs === 'pending' && rb === 'institute';

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: '#1976d2', width: 44, height: 44 }}>
          <Business />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>{inst.name}</Typography>
            <ConnStatusChip status={cs} requestedBy={rb} role="teacher" />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block">
            🏷️ {inst.institute_code} {inst.address ? `· 📍 ${inst.address}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">👨‍🏫 {inst.teacher_count} teachers</Typography>
            <Typography variant="caption" color="text.secondary">📚 {inst.class_count} classes</Typography>
          </Box>
        </Box>
      </Box>

      {!isConnected && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
          {isReceived ? (
            <>
              <Button size="small" variant="outlined" color="error" onClick={() => onReject(inst.connection_id)} disabled={loading}>
                Reject
              </Button>
              <Button size="small" variant="contained" color="success" onClick={() => onAccept(inst.connection_id)} disabled={loading}>
                Accept
              </Button>
            </>
          ) : !isSent ? (
            <Button size="small" variant="contained"
              sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}
              onClick={() => onRequest(inst.id)} disabled={loading}>
              Connect Request
            </Button>
          ) : null}
        </Box>
      )}
    </Paper>
  );
};

// ── Teacher Dashboard ─────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Connection state
  const [institutes, setInstitutes] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [connLoading, setConnLoading] = useState(true);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);

  const fetchStats = useCallback(() => {
    API.get('/teacher/dashboard')
      .then((r) => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchConnections = useCallback(() => {
    setConnLoading(true);
    Promise.all([
      API.get('/connections/my-institutes'),
      API.get('/connections/pending'),
      API.get('/connections/pending-count'),
    ]).then(([r1, r2, r3]) => {
      setInstitutes(r1.data.data || []);
      setPending(r2.data.data || []);
      setPendingCount(r3.data.count || 0);
    }).catch(() => {})
      .finally(() => setConnLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchConnections();
    const interval = setInterval(() => {
      API.get('/connections/pending-count').then((r) => setPendingCount(r.data.count || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchConnections]);

  const doSearch = useCallback(async () => {
    if (!searchQ.trim()) { setSearchResults([]); setSearchEmpty(false); return; }
    setSearchLoading(true);
    try {
      const r = await API.get(`/connections/search/institutes?q=${encodeURIComponent(searchQ)}`);
      setSearchResults(r.data.data || []);
      setSearchEmpty((r.data.data || []).length === 0);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, [searchQ]);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(doSearch, 400);
    return () => clearTimeout(t);
  }, [searchQ, searchOpen, doSearch]);

  const handleRequest = async (instituteId) => {
    setActionLoading(true);
    try {
      await API.post('/connections/request', { targetId: instituteId, targetType: 'institute' });
      toast.success('Connection request sent!');
      doSearch();
      fetchConnections();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(false); }
  };

  const handleAccept = async (connId) => {
    setActionLoading(true);
    try {
      await API.put(`/connections/${connId}/accept`);
      toast.success('Connection accepted!');
      fetchConnections();
      doSearch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async (connId) => {
    setActionLoading(true);
    try {
      await API.put(`/connections/${connId}/reject`);
      toast.success('Request rejected.');
      fetchConnections();
      doSearch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(false); }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    setActionLoading(true);
    try {
      await API.delete(`/connections/${disconnectTarget.connection_id}`);
      toast.success(`Disconnected from ${disconnectTarget.name}.`);
      setDisconnectTarget(null);
      fetchConnections();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(false); }
  };

  const statCards = [
    { label: 'My Classes', value: stats?.total_classes, icon: <School />, color: '#1976d2' },
    { label: 'Total Students', value: stats?.total_students, icon: <People />, color: '#388e3c' },
    { label: "Today's Attendance", value: stats?.today_attendance, icon: <EventNote />, color: '#f57c00' },
    { label: 'Unread Messages', value: stats?.unread_messages, icon: <Message />, color: '#7b1fa2' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Welcome, {user?.name}</Typography>
        {pendingCount > 0 && (
          <Tooltip title={`${pendingCount} pending connection request${pendingCount > 1 ? 's' : ''}`}>
            <Chip
              icon={<NotificationsActive sx={{ fontSize: 16 }} />}
              label={`${pendingCount} Pending Request${pendingCount > 1 ? 's' : ''}`}
              color="warning" variant="outlined"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            />
          </Tooltip>
        )}
      </Box>

      {/* Profile Card */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <ProfilePicUpload role="teacher" />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary">Teacher</Typography>
        </Box>
      </Paper>

      {/* Stat Cards */}
      <Grid container spacing={3}>
        {statCards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Paper sx={{ p: 3, borderRadius: 2, borderLeft: `4px solid ${c.color}` }}>
              {statsLoading ? (
                <Skeleton variant="rectangular" height={60} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: c.color }}>{c.value ?? '—'}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${c.color}15`, color: c.color }}>{c.icon}</Box>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Connections Panel */}
      <Paper sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        {/* Panel Header */}
        <Box sx={{ px: 3, py: 2, bgcolor: '#1976d2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Business sx={{ color: 'white' }} />
            <Typography variant="h6" fontWeight={700} color="white">මගේ Institutes</Typography>
            <Chip label={`${institutes.length} connected`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {pendingCount > 0 && (
              <Badge badgeContent={pendingCount} color="error">
                <Chip
                  icon={<Notifications sx={{ fontSize: 16, color: 'white' }} />}
                  label="Requests"
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'default' }}
                />
              </Badge>
            )}
            <Button
              variant="contained" size="small" startIcon={<Add />}
              sx={{ bgcolor: 'white', color: '#1976d2', '&:hover': { bgcolor: '#e3f2fd' } }}
              onClick={() => { setSearchOpen(true); setSearchQ(''); setSearchResults([]); }}
            >
              Institute සොයන්න
            </Button>
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Pending Incoming Requests */}
          {pending.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <HourglassEmpty sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
                  Pending Requests ({pending.length})
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {pending.map((req) => (
                  <Grid item xs={12} sm={6} md={4} key={req.connection_id}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#f57c00' }}>
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}><Business fontSize="small" /></Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{req.name}</Typography>
                          <Typography variant="caption" color="text.secondary">🏷️ {req.institute_code}</Typography>
                          {req.address && <Typography variant="caption" color="text.secondary" display="block" noWrap>📍 {req.address}</Typography>}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button fullWidth size="small" variant="outlined" color="error" onClick={() => handleReject(req.connection_id)} disabled={actionLoading}>
                          Reject
                        </Button>
                        <Button fullWidth size="small" variant="contained" color="success" onClick={() => handleAccept(req.connection_id)} disabled={actionLoading}>
                          Accept
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ mt: 3, mb: 2 }} />
            </Box>
          )}

          {/* Connected Institutes */}
          {connLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3].map((i) => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} /></Grid>)}
            </Grid>
          ) : institutes.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography color="text.secondary" gutterBottom>තවම institutes connected නෑ.</Typography>
              <Button variant="outlined" startIcon={<Search />} onClick={() => { setSearchOpen(true); setSearchQ(''); setSearchResults([]); }} sx={{ mt: 1 }}>
                Institute Search කරන්න
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {institutes.map((inst) => (
                <Grid item xs={12} sm={6} md={4} key={inst.connection_id}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative' }}>
                    <Chip label="Connected ✓" color="success" size="small" sx={{ position: 'absolute', top: 10, right: 10 }} />
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#1976d2', width: 44, height: 44 }}><Business /></Avatar>
                      <Box sx={{ flex: 1, minWidth: 0, pr: 8 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>{inst.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">🏷️ {inst.institute_code}</Typography>
                        {inst.address && <Typography variant="caption" color="text.secondary" noWrap>📍 {inst.address}</Typography>}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">📚 My Classes: <strong>{inst.my_class_count}</strong></Typography>
                      <Typography variant="caption" color="text.secondary">Total: <strong>{inst.total_classes}</strong></Typography>
                    </Box>
                    <Tooltip title="Disconnect from this institute">
                      <Button fullWidth size="small" variant="outlined" color="error" startIcon={<LinkOff />}
                        onClick={() => setDisconnectTarget(inst)}>
                        Disconnect
                      </Button>
                    </Tooltip>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Search Modal */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search sx={{ color: '#1976d2' }} />
            <Typography fontWeight={700}>Institute සොයන්න</Typography>
          </Box>
          <IconButton size="small" onClick={() => setSearchOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth autoFocus
            placeholder="Institute name හෝ code type කරන්න..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              endAdornment: searchLoading ? <CircularProgress size={18} /> : null,
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
            {searchResults.length > 0 ? (
              searchResults.map((inst) => (
                <InstSearchCard
                  key={inst.id}
                  inst={inst}
                  onRequest={handleRequest}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  loading={actionLoading}
                />
              ))
            ) : searchEmpty ? (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No institutes found for "{searchQ}".
              </Typography>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                Institute name හෝ code type කරලා search කරන්න.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSearchOpen(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Disconnect Confirmation */}
      <Dialog open={!!disconnectTarget} onClose={() => setDisconnectTarget(null)} PaperProps={{ sx: { borderRadius: 2, p: 1 } }}>
        <DialogTitle fontWeight={700}>Disconnect</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Warning sx={{ color: 'error.main' }} />
            <Typography><strong>{disconnectTarget?.name}</strong> institute එකෙන් disconnect වෙන්නද?</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisconnectTarget(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDisconnect} variant="contained" color="error" disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <LinkOff />}>
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
