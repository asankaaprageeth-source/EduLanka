import React from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Person, PersonOutline } from '@mui/icons-material';
import { Box, Typography, Button, Container, Paper } from '@mui/material';

const Landing = () => {
  const navigate = useNavigate();

  const roles = [
    { label: 'Institute', sinhala: 'ආයතනය', icon: <School sx={{ fontSize: 50 }} />, color: '#1976d2', path: '/register/institute' },
    { label: 'Student', sinhala: 'සිසුවා', icon: <Person sx={{ fontSize: 50 }} />, color: '#388e3c', path: '/register/student' },
    { label: 'Teacher', sinhala: 'ගුරුවරයා', icon: <PersonOutline sx={{ fontSize: 50 }} />, color: '#f57c00', path: '/register/teacher' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
            EduLanka
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            School & Tuition Management System
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
          {roles.map((r) => (
            <Paper
              key={r.label}
              onClick={() => navigate(r.path)}
              sx={{
                p: 4, width: 180, textAlign: 'center', cursor: 'pointer',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
              }}
            >
              <Box sx={{ color: r.color, mb: 1 }}>{r.icon}</Box>
              <Typography variant="h6" fontWeight={600}>{r.label}</Typography>
              <Typography variant="body2" color="text.secondary">{r.sinhala}</Typography>
              <Button variant="outlined" size="small" sx={{ mt: 2, borderColor: r.color, color: r.color }}
                onClick={(e) => { e.stopPropagation(); navigate(r.path); }}>
                Register
              </Button>
            </Paper>
          ))}
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
            Already have an account?
          </Typography>
          <Button variant="contained" size="large"
            sx={{ bgcolor: 'white', color: '#1976d2', fontWeight: 700, px: 4,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
            onClick={() => navigate('/login')}>
            Login
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Landing;
