const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { markByQR, markManual, getClassStudents } = require('../controllers/attendanceController');

router.post('/qr', auth, authorize('institute', 'teacher'), markByQR);
router.post('/manual', auth, authorize('institute', 'teacher'), markManual);
router.get('/class/:class_id/students', auth, authorize('institute', 'teacher'), getClassStudents);

module.exports = router;
