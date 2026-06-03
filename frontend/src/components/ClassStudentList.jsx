import React, { useEffect, useState } from 'react';
import {
  Avatar, Box, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, List, ListItem, ListItemAvatar, ListItemText,
  Typography, Button, Chip,
} from '@mui/material';
import { People } from '@mui/icons-material';
import API from '../services/api';

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const photoUrl = (photo) => (photo ? `${API_ROOT}/uploads/${photo}` : null);

const StudentAvatar = ({ student }) => (
  <Avatar
    src={photoUrl(student.photo)}
    sx={{ width: 50, height: 50, fontSize: 20, bgcolor: '#1976d2', border: '2px solid #e3f2fd' }}
    imgProps={{ onError: (e) => { e.target.src = ''; } }}
  >
    {student.name?.charAt(0)?.toUpperCase()}
  </Avatar>
);

const ClassStudentList = ({ open, onClose, classData }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !classData?.id) return;
    setLoading(true);
    API.get(`/teacher/classes/${classData.id}/students`)
      .then((res) => setStudents(res.data.data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [open, classData?.id]);

  // Reset when closed
  useEffect(() => {
    if (!open) setStudents([]);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          සිසුන් ලේඛනය
        </Typography>
        {classData?.name && (
          <Typography variant="body2" color="text.secondary">
            {classData.name}
            {!loading && (
              <Chip
                label={`${students.length} සිසුන්`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ ml: 1, height: 20, fontSize: 11 }}
              />
            )}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: 2, pt: '8px !important' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : students.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <People sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary" fontWeight={500}>
              මෙම පන්තියේ සිසුන් නොමැත
            </Typography>
            <Typography variant="caption" color="text.disabled">
              No students enrolled in this class yet.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {students.map((student, idx) => (
              <React.Fragment key={student.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem sx={{ py: 1.5, px: 1 }}>
                  <ListItemAvatar sx={{ minWidth: 66 }}>
                    <StudentAvatar student={student} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight={700} lineHeight={1.3}>
                        {student.name}
                      </Typography>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, mt: 0.3 }}>
                        {student.email && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {student.email}
                          </Typography>
                        )}
                        {student.student_id && (
                          <Typography component="span" variant="caption" color="text.disabled">
                            ID: {student.student_id}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClassStudentList;
