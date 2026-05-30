import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  LinearProgress, Divider, Avatar,
} from '@mui/material';
import { Quiz, CheckCircle, AccessTime, School, EmojiEvents } from '@mui/icons-material';
import API from '../../services/api';

function formatDateTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ExamCard = ({ exam }) => {
  const submitted = exam.submitted_at != null;
  const pct = submitted ? Number(exam.percentage) : null;
  const passed = pct !== null && pct >= 50;

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ bgcolor: submitted ? (passed ? '#388e3c' : '#d32f2f') : '#1976d2', px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
          <Quiz sx={{ color: 'white', fontSize: 22 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} color="white" noWrap>
            {exam.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            {exam.class_name}
          </Typography>
        </Box>
        <Chip
          label={submitted ? (passed ? 'Passed' : 'Failed') : 'Pending'}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
        />
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        {exam.description && (
          <Typography variant="body2" color="text.secondary">{exam.description}</Typography>
        )}

        <Divider />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{exam.duration_minutes} min</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <School sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{exam.total_marks} marks</Typography>
          </Box>
          {exam.rank_position && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmojiEvents sx={{ fontSize: 16, color: '#f57c00' }} />
              <Typography variant="body2" color="warning.dark">Rank #{exam.rank_position}</Typography>
            </Box>
          )}
        </Box>

        {submitted && (
          <>
            <Divider />
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  Score: {exam.score} / {exam.total_marks}
                </Typography>
                <Typography variant="body2" fontWeight={700} color={passed ? 'success.main' : 'error.main'}>
                  {pct}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={passed ? 'success' : 'error'}
                sx={{ borderRadius: 1, height: 6 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Submitted: {formatDateTime(exam.submitted_at)}
              </Typography>
            </Box>
          </>
        )}

        {!submitted && exam.start_time && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(exam.start_time)} – {formatDateTime(exam.end_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

const StudentExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/exams/student')
      .then((res) => setExams(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const submitted = exams.filter((e) => e.submitted_at);
  const pending   = exams.filter((e) => !e.submitted_at);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>My Exams</Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : exams.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Quiz sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">No exams available yet.</Typography>
        </Paper>
      ) : (
        <>
          {pending.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Pending ({pending.length})
              </Typography>
              <Grid container spacing={3}>
                {pending.map((e) => (
                  <Grid item xs={12} sm={6} md={4} key={e.id}>
                    <ExamCard exam={e} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {submitted.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Completed ({submitted.length})
              </Typography>
              <Grid container spacing={3}>
                {submitted.map((e) => (
                  <Grid item xs={12} sm={6} md={4} key={e.id}>
                    <ExamCard exam={e} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default StudentExams;
