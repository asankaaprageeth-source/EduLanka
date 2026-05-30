const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  markByQR, markManual, getClassStudents,
  markByQRAuto, getTodayLog, getActiveClasses,
  searchStudents, quickRegisterAndEnroll, enrollAndMark,
} = require('../controllers/attendanceController');

// Legacy
router.post('/qr', auth, authorize('institute', 'teacher'), markByQR);
router.post('/manual', auth, authorize('institute', 'teacher'), markManual);
router.get('/class/:class_id/students', auth, authorize('institute', 'teacher'), getClassStudents);

// New QR-auto endpoints
router.post('/mark-by-qr', auth, authorize('institute', 'teacher'), markByQRAuto);
router.get('/today', auth, authorize('institute', 'teacher'), getTodayLog);
router.get('/active-classes', auth, authorize('institute', 'teacher'), getActiveClasses);
router.get('/search-students', auth, authorize('institute', 'teacher'), searchStudents);
router.post('/quick-register', auth, authorize('institute', 'teacher'), quickRegisterAndEnroll);
router.post('/enroll-and-mark', auth, authorize('institute', 'teacher'), enrollAndMark);

module.exports = router;
