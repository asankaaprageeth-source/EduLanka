import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip, Divider,
  Table, TableHead, TableRow, TableCell, TableBody,
  ToggleButton, ToggleButtonGroup, Avatar,
} from '@mui/material';
import {
  Add, Delete, Quiz, CheckCircle, RadioButtonUnchecked,
  EmojiEvents, Publish, ArrowBack,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import API from '../../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────

const CORRECT_OPTIONS = ['a', 'b', 'c', 'd'];

const emptyQuestion = () => ({
  _key: Math.random(),
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'a',
  marks: 1,
});

const emptyExamForm = () => ({
  title: '',
  description: '',
  duration_minutes: 60,
  start_time: '',
  end_time: '',
  questions: [emptyQuestion()],
});

// ── Results Dialog ────────────────────────────────────────────────────────────

const ResultsDialog = ({ open, onClose, exam }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !exam) return;
    setLoading(true);
    API.get(`/exams/${exam.id}/results`)
      .then((res) => setResults(res.data.data))
      .catch(() => toast.error('Failed to load results.'))
      .finally(() => setLoading(false));
  }, [open, exam]);

  const rankColor = (rank) =>
    rank === 1 ? '#f9a825' : rank === 2 ? '#90a4ae' : rank === 3 ? '#a1887f' : 'inherit';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEvents sx={{ color: '#f9a825' }} />
          Results — {exam?.title}
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={400}>
          {Number(exam?.result_count ?? 0)} submissions · {Number(exam?.total_marks ?? 0)} total marks
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : results.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <EmojiEvents sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No submissions yet.</Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography fontWeight={700} sx={{ color: rankColor(r.rank_position) }}>
                        #{r.rank_position}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: '#1976d2' }}>
                          {r.student_name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{r.student_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.student_id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {r.score} / {r.total_marks}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${Number(r.percentage).toFixed(1)}%`}
                        size="small"
                        color={Number(r.percentage) >= 50 ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                      </Typography>
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
  );
};

// ── Create Exam Dialog ────────────────────────────────────────────────────────

const CreateExamDialog = ({ open, onClose, classData, onCreated }) => {
  const [form, setForm] = useState(emptyExamForm());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { if (open) { setForm(emptyExamForm()); setErrors({}); } }, [open]);

  const setField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const setQField = (idx, field) => (e) => {
    setForm((p) => {
      const qs = [...p.questions];
      qs[idx] = { ...qs[idx], [field]: e.target.value };
      return { ...p, questions: qs };
    });
  };

  const setQCorrect = (idx, val) => {
    if (!val) return;
    setForm((p) => {
      const qs = [...p.questions];
      qs[idx] = { ...qs[idx], correct_answer: val };
      return { ...p, questions: qs };
    });
  };

  const addQuestion = () =>
    setForm((p) => ({ ...p, questions: [...p.questions, emptyQuestion()] }));

  const removeQuestion = (idx) =>
    setForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.duration_minutes || Number(form.duration_minutes) < 1)
      errs.duration_minutes = 'Duration must be at least 1 minute.';
    if (form.questions.length === 0) errs.questions = 'Add at least one question.';
    form.questions.forEach((q, i) => {
      if (!q.question.trim()) errs[`q_${i}_question`] = 'Required.';
      if (!q.option_a.trim()) errs[`q_${i}_a`] = 'Required.';
      if (!q.option_b.trim()) errs[`q_${i}_b`] = 'Required.';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await API.post('/exams', {
        class_id: classData.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        duration_minutes: Number(form.duration_minutes),
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        questions: form.questions.map((q) => ({
          question: q.question.trim(),
          option_a: q.option_a.trim(),
          option_b: q.option_b.trim(),
          option_c: q.option_c.trim() || null,
          option_d: q.option_d.trim() || null,
          correct_answer: q.correct_answer,
          marks: Number(q.marks) || 1,
        })),
      });
      toast.success('Exam created.');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>Create Exam — {classData?.name}</DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {/* Basic info */}
        <TextField
          label="Exam Title"
          value={form.title}
          onChange={setField('title')}
          error={!!errors.title}
          helperText={errors.title}
          fullWidth required
        />
        <TextField
          label="Description (optional)"
          value={form.description}
          onChange={setField('description')}
          fullWidth multiline rows={2}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Duration (minutes)"
            type="number"
            value={form.duration_minutes}
            onChange={setField('duration_minutes')}
            error={!!errors.duration_minutes}
            helperText={errors.duration_minutes}
            inputProps={{ min: 1 }}
            sx={{ width: 180 }}
          />
          <TextField
            label="Start Time (optional)"
            type="datetime-local"
            value={form.start_time}
            onChange={setField('start_time')}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="End Time (optional)"
            type="datetime-local"
            value={form.end_time}
            onChange={setField('end_time')}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>

        {/* Questions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Questions ({form.questions.length})
          </Typography>
          <Button size="small" startIcon={<Add />} onClick={addQuestion} variant="outlined">
            Add Question
          </Button>
        </Box>
        {errors.questions && (
          <Typography variant="caption" color="error">{errors.questions}</Typography>
        )}

        {form.questions.map((q, idx) => (
          <Paper key={q._key} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" fontWeight={700} color="primary">
                Q{idx + 1}
              </Typography>
              <Tooltip title="Remove question">
                <IconButton size="small" color="error" onClick={() => removeQuestion(idx)}
                  disabled={form.questions.length === 1}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              label="Question"
              value={q.question}
              onChange={setQField(idx, 'question')}
              error={!!errors[`q_${idx}_question`]}
              helperText={errors[`q_${idx}_question`]}
              fullWidth multiline rows={2} size="small" sx={{ mb: 1.5 }}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <TextField label="Option A *" value={q.option_a} onChange={setQField(idx, 'option_a')}
                error={!!errors[`q_${idx}_a`]} helperText={errors[`q_${idx}_a`]} size="small" />
              <TextField label="Option B *" value={q.option_b} onChange={setQField(idx, 'option_b')}
                error={!!errors[`q_${idx}_b`]} helperText={errors[`q_${idx}_b`]} size="small" />
              <TextField label="Option C (optional)" value={q.option_c} onChange={setQField(idx, 'option_c')} size="small" />
              <TextField label="Option D (optional)" value={q.option_d} onChange={setQField(idx, 'option_d')} size="small" />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                Correct Answer:
              </Typography>
              <ToggleButtonGroup
                value={q.correct_answer}
                exclusive
                onChange={(_, v) => setQCorrect(idx, v)}
                size="small"
              >
                {CORRECT_OPTIONS.map((opt) => (
                  <ToggleButton
                    key={opt}
                    value={opt}
                    disabled={opt === 'c' && !q.option_c || opt === 'd' && !q.option_d}
                    sx={{
                      px: 1.5, py: 0.3, fontSize: 12, textTransform: 'uppercase',
                      '&.Mui-selected': { bgcolor: '#1976d2', color: '#fff', '&:hover': { bgcolor: '#1565c0' } },
                    }}
                  >
                    {opt}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <TextField
                label="Marks"
                type="number"
                value={q.marks}
                onChange={setQField(idx, 'marks')}
                inputProps={{ min: 1 }}
                size="small"
                sx={{ width: 80 }}
              />
            </Box>
          </Paper>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Quiz />}>
          {saving ? 'Creating…' : 'Create Exam'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Exams List Dialog ─────────────────────────────────────────────────────────

const ExamsDialog = ({ open, onClose, classData }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [resultsExam, setResultsExam] = useState(null);
  const [publishing, setPublishing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    if (!classData) return;
    setLoading(true);
    API.get(`/exams/class/${classData.id}`)
      .then((res) => setExams(res.data.data))
      .catch(() => toast.error('Failed to load exams.'))
      .finally(() => setLoading(false));
  }, [classData]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handlePublish = async (exam) => {
    setPublishing(exam.id);
    try {
      await API.put(`/exams/${exam.id}/publish`);
      toast.success('Exam published — students can now see it.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish.');
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Delete "${exam.title}"? This will also remove all results.`)) return;
    setDeleting(exam.id);
    try {
      await API.delete(`/exams/${exam.id}`);
      toast.success('Exam deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeleting(null);
    }
  };

  const totalMarks = (exam) => Number(exam.total_marks ?? 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              Exams
              <Typography variant="body2" color="text.secondary" fontWeight={400}>
                {classData?.name}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setCreateOpen(true)}
              sx={{ mt: 0.5 }}
            >
              New Exam
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 2, pt: '8px !important' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : exams.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Quiz sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No exams yet. Click "New Exam" to create one.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {exams.map((exam, idx) => (
                <React.Fragment key={exam.id}>
                  {idx > 0 && <Divider />}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    {/* Title row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography fontWeight={700}>{exam.title}</Typography>
                        {exam.description && (
                          <Typography variant="caption" color="text.secondary">{exam.description}</Typography>
                        )}
                      </Box>
                      <Chip
                        icon={exam.is_published ? <CheckCircle /> : <RadioButtonUnchecked />}
                        label={exam.is_published ? 'Published' : 'Draft'}
                        color={exam.is_published ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    {/* Stats row */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip label={`${Number(exam.question_count)} questions`} size="small" variant="outlined" />
                      <Chip label={`${totalMarks(exam)} marks`} size="small" variant="outlined" />
                      <Chip label={`${exam.duration_minutes} min`} size="small" variant="outlined" />
                      {Number(exam.result_count) > 0 && (
                        <Chip label={`${Number(exam.result_count)} submitted`} size="small" color="primary" variant="outlined" />
                      )}
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!exam.is_published && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={publishing === exam.id ? <CircularProgress size={14} /> : <Publish />}
                          onClick={() => handlePublish(exam)}
                          disabled={publishing === exam.id || Number(exam.question_count) === 0}
                        >
                          Publish
                        </Button>
                      )}
                      {Number(exam.result_count) > 0 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<EmojiEvents />}
                          onClick={() => setResultsExam(exam)}
                        >
                          Results
                        </Button>
                      )}
                      <Box sx={{ flex: 1 }} />
                      <Tooltip title="Delete exam">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(exam)}
                            disabled={deleting === exam.id}
                          >
                            {deleting === exam.id ? <CircularProgress size={16} /> : <Delete fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Paper>
                </React.Fragment>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      <CreateExamDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        classData={classData}
        onCreated={load}
      />

      <ResultsDialog
        open={!!resultsExam}
        onClose={() => setResultsExam(null)}
        exam={resultsExam}
      />
    </>
  );
};

export { ExamsDialog, ResultsDialog };
