import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Avatar, Chip, TextField, InputAdornment, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import { Search, QrCode, QrCodeScanner, Close, Download } from '@mui/icons-material';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import API from '../../services/api';
import QrScannerModal from '../../components/QrScannerModal';

// ── QR View Dialog ─────────────────────────────────────────────────────────────

const QrViewDialog = ({ student, onClose }) => {
  const qrValue = student
    ? JSON.stringify({ userId: student.id, student_id: student.student_id })
    : '';

  const handleDownload = () => {
    const canvas = document.getElementById('qr-canvas-dl');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.student_id || student.name}-QR.png`;
    a.click();
  };

  return (
    <Dialog open={!!student} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        QR Code
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
        {student && (
          <>
            <Box sx={{ display: 'inline-block', p: 2, border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
              <QRCodeSVG value={qrValue} size={200} />
              <Box sx={{ display: 'none' }}>
                <QRCodeCanvas id="qr-canvas-dl" value={qrValue} size={512} />
              </Box>
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>{student.name}</Typography>
            <Typography variant="body2" color="text.secondary">{student.student_id || '—'}</Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
        <Button variant="outlined" startIcon={<Download />} onClick={handleDownload}>Download</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main Students Component ────────────────────────────────────────────────────

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qrStudent, setQrStudent] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightRowRef = useRef(null);

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

  const handleScanResult = useCallback((rawText) => {
    let studentId = null;
    let userId = null;
    try {
      const data = JSON.parse(rawText);
      studentId = data.student_id;
      userId = data.userId;
    } catch {
      studentId = rawText;
    }

    const found = students.find(
      (s) =>
        (studentId && s.student_id === studentId) ||
        (userId != null && s.id === userId)
    );

    if (found) {
      setSearch('');
      setHighlightedId(found.id);
      toast.success(`${found.name} found!`);
      setTimeout(() => {
        highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else {
      toast.error('Student not found.');
    }
  }, [students]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Students</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">{students.length} total</Typography>
          <Button
            variant="outlined"
            startIcon={<QrCodeScanner />}
            onClick={() => { setHighlightedId(null); setScannerOpen(true); }}
          >
            Scan QR
          </Button>
        </Box>
      </Box>

      <TextField
        placeholder="Search by name or ID..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setHighlightedId(null); }}
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
              {filtered.map((s) => {
                const highlighted = s.id === highlightedId;
                return (
                  <TableRow
                    key={s.id}
                    hover
                    ref={highlighted ? highlightRowRef : null}
                    sx={{
                      bgcolor: highlighted ? '#e3f2fd' : 'inherit',
                      outline: highlighted ? '2px solid #1976d2' : 'none',
                      outlineOffset: '-2px',
                      transition: 'background-color 0.4s',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1976d2' }}>{s.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography fontWeight={600}>{s.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.student_id || 'N/A'} size="small" color={highlighted ? 'primary' : 'default'} />
                    </TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanResult}
      />

      <QrViewDialog student={qrStudent} onClose={() => setQrStudent(null)} />
    </Box>
  );
};

export default Students;
