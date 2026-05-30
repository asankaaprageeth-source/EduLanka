import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, TextField, MenuItem, LinearProgress,
} from '@mui/material';
import { Quiz, AccessTime, School, EmojiEvents } from '@mui/icons-material';
import API from '../../services/api';

function formatDateTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TeacherExams = () => {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/teacher/classes')
      .then((res) => {
        const data = res.data.data || [];
        setClasses(data);
        if (data.length > 0) setClassId(String(data[0].id));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    API.get(`/exams/class/${classId}`)
      .then((res) => setExams(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [classId]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Exams</Typography>

      <TextField
        select
        label="Class"
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        sx={{ minWidth: 280, mb: 3 }}
      >
        {classes.map((c) => (
          <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
        ))}
      </TextField>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : exams.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Quiz sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">No exams for this class yet.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Exam</TableCell>
                <TableCell>Duration / Marks</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell align="center">Questions</TableCell>
                <TableCell align="center">Submissions</TableCell>
                <TableCell>Avg Score</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exams.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Quiz sx={{ fontSize: 18, color: '#1976d2' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{e.title}</Typography>
                        {e.description && (
                          <Typography variant="caption" color="text.secondary">{e.description}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption">{e.duration_minutes} min</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <School sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption">{e.total_marks} marks</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {e.start_time ? (
                      <Box>
                        <Typography variant="caption" display="block">{formatDateTime(e.start_time)}</Typography>
                        <Typography variant="caption" color="text.secondary">– {formatDateTime(e.end_time)}</Typography>
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{e.question_count}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{e.result_count}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    {e.avg_percentage != null ? (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">{e.avg_percentage}%</Typography>
                          {e.pass_count > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <EmojiEvents sx={{ fontSize: 13, color: '#f57c00' }} />
                              <Typography variant="caption" color="warning.dark">{e.pass_count} passed</Typography>
                            </Box>
                          )}
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Number(e.avg_percentage)}
                          color={e.avg_percentage >= 50 ? 'success' : 'error'}
                          sx={{ borderRadius: 1, height: 5 }}
                        />
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={e.is_published ? 'Published' : 'Draft'}
                      color={e.is_published ? 'success' : 'default'}
                      size="small"
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

export default TeacherExams;
