import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem,
  Divider, Badge, useTheme, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, People, School, Assignment,
  AttachMoney, Message, ExitToApp, BarChart, PersonAdd, EventNote, AccountCircle
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;

const navItems = {
  institute: [
    { label: 'Dashboard', icon: <Dashboard />, path: '/institute/dashboard' },
    { label: 'Students', icon: <People />, path: '/institute/students' },
    { label: 'Teachers', icon: <PersonAdd />, path: '/institute/teachers' },
    { label: 'Classes', icon: <School />, path: '/institute/classes' },
    { label: 'Attendance', icon: <EventNote />, path: '/institute/attendance' },
    { label: 'Payments', icon: <AttachMoney />, path: '/institute/payments' },
    { label: 'Messages', icon: <Message />, path: '/institute/messages' },
    { label: 'Reports', icon: <BarChart />, path: '/institute/reports' },
  ],
  teacher: [
    { label: 'Dashboard', icon: <Dashboard />, path: '/teacher/dashboard' },
    { label: 'My Classes', icon: <School />, path: '/teacher/classes' },
    { label: 'Attendance', icon: <EventNote />, path: '/teacher/attendance' },
    { label: 'Exams', icon: <Assignment />, path: '/teacher/exams' },
    { label: 'Messages', icon: <Message />, path: '/teacher/messages' },
    { label: 'Reports', icon: <BarChart />, path: '/teacher/reports' },
  ],
  student: [
    { label: 'Dashboard', icon: <Dashboard />, path: '/student/dashboard' },
    { label: 'My Classes', icon: <School />, path: '/student/classes' },
    { label: 'Attendance', icon: <EventNote />, path: '/student/attendance' },
    { label: 'Payments', icon: <AttachMoney />, path: '/student/payments' },
    { label: 'Exams', icon: <Assignment />, path: '/student/exams' },
    { label: 'Messages', icon: <Message />, path: '/student/messages' },
  ],
};

const roleColors = { institute: '#1976d2', teacher: '#f57c00', student: '#388e3c' };

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnread = useCallback(() => {
    if (user?.role === 'student' || user?.role === 'teacher') {
      API.get('/messages/unread-count')
        .then((r) => setUnreadMessages(r.data.count || 0))
        .catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  if (!user) return null;

  const items = navItems[user.role] || [];
  const color = roleColors[user.role] || '#1976d2';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2, bgcolor: color, color: 'white', textAlign: 'center' }}>
        <School sx={{ fontSize: 36 }} />
        <Typography variant="h6" fontWeight={700}>EduLanka</Typography>
        <Typography variant="caption" sx={{ opacity: 0.85, textTransform: 'capitalize' }}>
          {user.role} Panel
        </Typography>
      </Box>
      <Divider />
      <List>
        {items.map((item) => {
          const isMessages = item.label === 'Messages';
          const showBadge  = isMessages && unreadMessages > 0;
          return (
            <ListItem
              key={item.path}
              button
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => {
                if (isMobile) setMobileOpen(false);
                if (isMessages) setUnreadMessages(0);
              }}
              sx={{
                '&.Mui-selected': { bgcolor: `${color}15`, borderRight: `3px solid ${color}` },
                '&.Mui-selected .MuiListItemIcon-root': { color },
                '&.Mui-selected .MuiListItemText-root': { color },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Badge badgeContent={showBadge ? unreadMessages : 0} color="error" max={99}>
                  {item.icon}
                </Badge>
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: color }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>EduLanka</Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ bgcolor: 'white', color, width: 36, height: 36, fontSize: 16 }}>
              {user.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Box>
                <Typography fontWeight={600}>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user.role}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            {(user.role === 'student' || user.role === 'teacher') && (
              <MenuItem onClick={() => { setAnchorEl(null); navigate(`/${user.role}/profile`); }}>
                <AccountCircle sx={{ mr: 1, fontSize: 20 }} /> My Profile
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ExitToApp sx={{ mr: 1, fontSize: 20 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', top: 64 } }}>
        {drawer}
      </Drawer>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: { md: `${DRAWER_WIDTH}px` } }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
