import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import Landing from './pages/auth/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import InstituteDashboard from './pages/institute/Dashboard';
import InstituteStudents from './pages/institute/Students';
import InstituteAttendance from './pages/institute/Attendance';
import InstitutePayments from './pages/institute/Payments';
import InstituteTeachers from './pages/institute/Teachers';
import InstituteClasses from './pages/institute/Classes';
import InstituteMessages from './pages/institute/Messages';
import InstituteReports from './pages/institute/Reports';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherClasses from './pages/teacher/Classes';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherExams from './pages/teacher/Exams';
import TeacherMessages from './pages/teacher/Messages';
import TeacherReports from './pages/teacher/Reports';

import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';

import StudentDashboard from './pages/student/Dashboard';
import StudentClasses from './pages/student/Classes';
import StudentAttendance from './pages/student/Attendance';
import StudentExams from './pages/student/Exams';
import StudentPayments from './pages/student/Payments';
import StudentMessages from './pages/student/Messages';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/register/:role" element={<Register />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

      {/* Institute Routes */}
      <Route path="/institute/dashboard" element={<ProtectedRoute role="institute"><InstituteDashboard /></ProtectedRoute>} />
      <Route path="/institute/students" element={<ProtectedRoute role="institute"><InstituteStudents /></ProtectedRoute>} />
      <Route path="/institute/attendance" element={<ProtectedRoute role="institute"><InstituteAttendance /></ProtectedRoute>} />
      <Route path="/institute/payments" element={<ProtectedRoute role="institute"><InstitutePayments /></ProtectedRoute>} />
      <Route path="/institute/messages" element={<ProtectedRoute role="institute"><InstituteMessages /></ProtectedRoute>} />
      <Route path="/institute/teachers" element={<ProtectedRoute role="institute"><InstituteTeachers /></ProtectedRoute>} />
      <Route path="/institute/classes" element={<ProtectedRoute role="institute"><InstituteClasses /></ProtectedRoute>} />
      <Route path="/institute/reports" element={<ProtectedRoute role="institute"><InstituteReports /></ProtectedRoute>} />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute role="teacher"><TeacherClasses /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute role="teacher"><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/teacher/exams" element={<ProtectedRoute role="teacher"><TeacherExams /></ProtectedRoute>} />
      <Route path="/teacher/messages" element={<ProtectedRoute role="teacher"><TeacherMessages /></ProtectedRoute>} />
      <Route path="/teacher/reports" element={<ProtectedRoute role="teacher"><TeacherReports /></ProtectedRoute>} />

      {/* Shared profile route (student + teacher) */}
      <Route path="/student/profile" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute role="teacher"><Profile /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/classes" element={<ProtectedRoute role="student"><StudentClasses /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/payments" element={<ProtectedRoute role="student"><StudentPayments /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute role="student"><StudentExams /></ProtectedRoute>} />
      <Route path="/student/messages" element={<ProtectedRoute role="student"><StudentMessages /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <Router>
      <Toaster position="top-right" />
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;
