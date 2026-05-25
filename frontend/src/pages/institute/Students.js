import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Avatar, Chip, TextField, InputAdornment, CircularProgress, Button
} from '@mui/material';
import { Search, QrCode } from '@mui/icons-material';
import API from '../../services/api';
import QRCode from 'qrcode.react';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qrStudent, setQrStudent] = useState(null);

  useEffect(() => {
    API.get('/institute/students')
      .then((res) => setStudents(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Students</Typography>
        <Typography variant="body2" color="text.secondary">{students.length} total</Typography>
      </Box>

      <TextField
        placeholder="Search by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 2, width: 300 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
      />

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Parent Phone</TableCell>
                <TableCell>Classes</TableCell>
                <TableCell>QR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#1976d2' }}>{s.name.charAt(0)}</Avatar>
                      <Box>
                        <Typography fontWeight={600}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={s.student_id || 'N/A'} size="small" /></TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell>{s.parent_phone || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{s.classes || 'Not enrolled'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<QrCode />} onClick={() => setQrStudent(s)}>
                      View QR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={!!qrStudent} onClose={() => setQrStudent(null)}>
        <DialogTitle>QR Code — {qrStudent?.name}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          {qrStudent && (
            <>
              <QRCode value={JSON.stringify({ userId: qrStudent.id, student_id: qrStudent.student_id })} size={200} />
              <Typography variant="body2" sx={{ mt: 2 }}>{qrStudent.student_id}</Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Students;
