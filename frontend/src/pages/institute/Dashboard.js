import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Button, Chip,
  Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, IconButton, Skeleton, Badge, Tooltip, MenuItem,
} from '@mui/material';
import {
  People, School, EventNote, AttachMoney, Warning, PersonAdd,
  Add, Search, Close, LinkOff, Notifications, HourglassEmpty,
  NotificationsActive, CheckCircle,
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

const SUBJECTS_FLAT = [
  'Sinhala (සිංහල)','Tamil (දෙමළ)','English (ඉංග්‍රීසි)',
  'Mathematics (ගණිතය)','Combined Mathematics (සංයුක්ත ගණිතය)',
  'Science (විද්‍යාව)','Physics (භෞතික විද්‍යාව)','Chemistry (රසායන විද්‍යාව)','Biology (ජීව විද්‍යාව)',
  'History (ඉතිහාසය)','Geography (භූගෝල විද්‍යාව)','Civics (පුරවැසි අධ්‍යාපනය)',
  'Business Studies (ව්‍යාපාර අධ්‍යයනය)','Accounting (ගිණුම්කරණය)','Economics (ආර්ථික විද්‍යාව)',
  'ICT (තොරතුරු හා සන්නිවේදන තාක්ෂණය)','Technology (තාක්ෂණය)',
  'Art (චිත්‍ර කලාව)','Music (සංගීතය)','Buddhism (බෞද්ධ ධර්මය)',
  'Physical Education (ශාරීරික අධ්‍යාපනය)','Agriculture (කෘෂිකර්මය)','Other (වෙනත්)',
];

function parseSubjects(raw) {
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function initials(name) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const StatCard = ({ title, value, icon, color, sub, loading }) => (
  <Paper sx={{ p: 3, borderRadius: 2, borderLeft: `4px solid ${color}` }}>
    {loading ? <Skeleton variant="rectangular" height={60} /> : (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight={700} sx={{ color }}>{value ?? '—'}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color }}>{icon}</Box>
      </Box>
    )}
  </Paper>
);

// ── Teacher search result card ────────────────────────────────────────────────
const TeacherSearchCard = ({ teacher, onRequest, onAccept, onReject, loading }) => {
  const cs = teacher.connection_status;
  const rb = teacher.requested_by;
  const subjects = parseSubjects(teacher.subjects);
  const isConnected = cs === 'accepted';
  const isSent = cs === 'pending' && rb === 'institute';
  const isReceived = cs === 'pending' && rb === 'teacher';

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#f57c00', width: 44, height: 44, fontSize: 15 }}>{initials(teacher.name)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>{teacher.name}</Typography>
            {isConnected && <Chip label="Connected ✓" color="success" size="small" />}
            {isSent && <Chip label="Pending... ⏳" size="small" sx={{ bgcolor: '#fff8e1', color: '#f57c00', border: '1px solid #f57c00' }} />}
            {isReceived && <Chip label="Respond 🔔" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2', border: '1px solid #1976d2' }} />}
          </Box>
          {subjects.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 0.5 }}>
              {subjects.slice(0, 4).map((s) => (
                <Chip key={s} label={s} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: 10, height: 20 }} />
              ))}
              {subjects.length > 4 && <Chip label={`+${subjects.length - 4}`} size="small" sx={{ height: 20, fontSize: 10 }} />}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {teacher.district && <Typography variant="caption" color="text.secondary">📍 {teacher.district}{teacher.city ? `, ${teacher.city}` : ''}</Typography>}
            <Typography variant="caption" color="text.secondary">🏫 {teacher.institute_count} institutes</Typography>
            <Typography variant="caption" color="text.secondary">📚 {teacher.class_count} classes</Typography>
          </Box>
        </Box>
      </Box>

      {!isConnected && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
          {isReceived ? (
            <>
              <Button size="small" variant="outlined" color="error" onClick={() => onReject(teacher.connection_id)} disabled={loading}>Reject</Button>
              <Button size="small" variant="contained" color="success" onClick={() => onAccept(teacher.connection_id)} disabled={loading}>Accept</Button>
            </>
          ) : !isSent ? (
            <Button size="small" variant="contained"
              sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}
              onClick={() => onRequest(teacher.id)} disabled={loading}>
              Connect Request
            </Button>
          ) : null}
        </Box>
      )}
    </Paper>
  );
};

// ── Institute Dashboard ───────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Connection state
  const [teachers, setTeachers] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [connLoading, setConnLoading] = useState(true);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);

  // Action
  const [actionLoading, setActionLoading] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);

  const fetchStats = useCallback(() => {
    API.get('/institute/dashboard')
      .then((r) => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchConnections = useCallback(() => {
    setConnLoading(true);
    Promise.all([
      API.get('/connections/my-teachers'),
      API.get('/connections/pending'),
      API.get('/connections/pending-count'),
    ]).then(([r1, r2, r3]) => {
      setTeachers(r1.data.data || []);
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
    if (!searchQ.trim() && !searchDistrict && !searchSubject) {
      setSearchResults([]); setSearchEmpty(false); return;
    }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set('q', searchQ.trim());
      if (searchDistrict) params.set('district', searchDistrict);
      if (searchSubject) params.set('subject', searchSubject);
      const r = await API.get(`/connections/search/teachers?${params}`);
      setSearchResults(r.data.data || []);
      setSearchEmpty((r.data.data || []).length === 0);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, [searchQ, searchDistrict, searchSubject]);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(doSearch, 400);
    return () => clearTimeout(t);
  }, [searchQ, searchDistrict, searchSubject, searchOpen, doSearch]);

  const handleRequest = async (teacherId) => {
    setActionLoading(true);
    try {
      await API.post('/connections/request', { targetId: teacherId, targetType: 'teacher' });
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
      toast.success(`${disconnectTarget.name} disconnected.`);
      setDisconnectTarget(null);
      fetchConnections();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(false); }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Welcome, {user?.name}</Typography>
          <Typography variant="body2" color="text.secondary">Institute Code: <strong>{user?.institute_code}</strong></Typography>
        </Box>
        {pendingCount > 0 && (
          <Tooltip title={`${pendingCount} pending teacher request${pendingCount > 1 ? 's' : ''}`}>
            <Chip
              icon={<NotificationsActive sx={{ fontSize: 16 }} />}
              label={`${pendingCount} Pending Request${pendingCount > 1 ? 's' : ''}`}
              color="warning" variant="outlined"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            />
          </Tooltip>
        )}
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Students" value={stats?.total_students} icon={<People />} color="#1976d2" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Teachers" value={stats?.total_teachers} icon={<PersonAdd />} color="#f57c00" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Classes" value={stats?.total_classes} icon={<School />} color="#7b1fa2" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Today's Attendance" value={stats?.today_attendance} icon={<EventNote />} color="#388e3c" sub="Present today" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Monthly Income" value={`Rs. ${Number(stats?.monthly_income || 0).toLocaleString()}`} icon={<AttachMoney />} color="#0288d1" sub="This month" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Pending Fees" value={stats?.pending_fees} icon={<Warning />} color="#d32f2f" sub="Unpaid records" loading={statsLoading} />
        </Grid>
      </Grid>

      {/* Teachers Connection Panel */}
      <Paper sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, bgcolor: '#f57c00', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonAdd sx={{ color: 'white' }} />
            <Typography variant="h6" fontWeight={700} color="white">අපගේ Teachers</Typography>
            <Chip label={`${teachers.length} connected`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {pendingCount > 0 && (
              <Badge badgeContent={pendingCount} color="error">
                <Chip
                  icon={<Notifications sx={{ fontSize: 16, color: 'white' }} />}
                  label="Requests"
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Badge>
            )}
            <Button
              variant="contained" size="small" startIcon={<Add />}
              sx={{ bgcolor: 'white', color: '#f57c00', '&:hover': { bgcolor: '#fff3e0' } }}
              onClick={() => { setSearchOpen(true); setSearchQ(''); setSearchDistrict(''); setSearchSubject(''); setSearchResults([]); }}
            >
              Teacher සොයන්න
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
                {pending.map((req) => {
                  const subj = parseSubjects(req.subjects);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={req.connection_id}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#f57c00' }}>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                          <Avatar sx={{ bgcolor: '#f57c00', width: 40, height: 40, fontSize: 14 }}>{initials(req.name)}</Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>{req.name}</Typography>
                            {req.district && <Typography variant="caption" color="text.secondary">📍 {req.district}</Typography>}
                          </Box>
                        </Box>
                        {subj.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            {subj.slice(0, 3).map((s) => <Chip key={s} label={s} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: 10, height: 18 }} />)}
                            {subj.length > 3 && <Chip label={`+${subj.length - 3}`} size="small" sx={{ height: 18, fontSize: 10 }} />}
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button fullWidth size="small" variant="outlined" color="error" onClick={() => handleReject(req.connection_id)} disabled={actionLoading}>Reject</Button>
                          <Button fullWidth size="small" variant="contained" color="success" onClick={() => handleAccept(req.connection_id)} disabled={actionLoading}>Accept</Button>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              <Divider sx={{ mt: 3, mb: 2 }} />
            </Box>
          )}

          {/* Connected Teachers */}
          {connLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3].map((i) => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rectangular" height={130} sx={{ borderRadius: 2 }} /></Grid>)}
            </Grid>
          ) : teachers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <PersonAdd sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography color="text.secondary" gutterBottom>තවම teachers connected නෑ.</Typography>
              <Button variant="outlined" startIcon={<Search />}
                onClick={() => { setSearchOpen(true); setSearchQ(''); setSearchDistrict(''); setSearchSubject(''); setSearchResults([]); }}
                sx={{ mt: 1 }}>
                Teacher Search කරන්න
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {teachers.map((t) => {
                const subjects = parseSubjects(t.subjects);
                return (
                  <Grid item xs={12} sm={6} md={4} key={t.connection_id}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative' }}>
                      <Chip label="Connected ✓" color="success" size="small" sx={{ position: 'absolute', top: 10, right: 10 }} />
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 1, pr: 8 }}>
                        <Avatar sx={{ bgcolor: '#f57c00', width: 44, height: 44, fontSize: 15 }}>{initials(t.name)}</Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>{t.name}</Typography>
                          {t.district && <Typography variant="caption" color="text.secondary" display="block">📍 {t.district}{t.city ? `, ${t.city}` : ''}</Typography>}
                          {t.email && <Typography variant="caption" color="text.secondary">{t.email}</Typography>}
                        </Box>
                      </Box>
                      {subjects.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {subjects.slice(0, 3).map((s) => <Chip key={s} label={s} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: 10, height: 20 }} />)}
                          {subjects.length > 3 && <Chip label={`+${subjects.length - 3}`} size="small" sx={{ height: 20, fontSize: 10 }} />}
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        📚 This institute: <strong>{t.class_count}</strong> classes
                      </Typography>
                      <Tooltip title="Remove this teacher connection">
                        <Button fullWidth size="small" variant="outlined" color="error" startIcon={<LinkOff />}
                          onClick={() => setDisconnectTarget(t)}>
                          Remove
                        </Button>
                      </Tooltip>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Teacher Search Modal */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search sx={{ color: '#f57c00' }} />
            <Typography fontWeight={700}>Teacher සොයන්න</Typography>
          </Box>
          <IconButton size="small" onClick={() => setSearchOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth autoFocus
            placeholder="Teacher name හෝ subject type කරන්න..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              endAdornment: searchLoading ? <CircularProgress size={18} /> : null,
            }}
            sx={{ mb: 1.5 }}
          />
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <TextField select size="small" label="District" value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)} sx={{ flex: 1 }}>
              <MenuItem value="">All Districts</MenuItem>
              {SL_DISTRICTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Subject" value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)} sx={{ flex: 1 }}>
              <MenuItem value="">All Subjects</MenuItem>
              {SUBJECTS_FLAT.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Box>
          <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
            {searchResults.length > 0 ? (
              searchResults.map((t) => (
                <TeacherSearchCard
                  key={t.id}
                  teacher={t}
                  onRequest={handleRequest}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  loading={actionLoading}
                />
              ))
            ) : searchEmpty ? (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No teachers found for your search.
              </Typography>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                Teacher name, subject, හෝ district search කරන්න.
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
        <DialogTitle fontWeight={700}>Remove Teacher</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning sx={{ color: 'error.main' }} />
            <Typography><strong>{disconnectTarget?.name}</strong> teacher connection remove කරන්නද?</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisconnectTarget(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDisconnect} variant="contained" color="error" disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <LinkOff />}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
