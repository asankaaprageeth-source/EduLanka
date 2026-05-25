const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/database');

// Teacher dashboard
router.get('/dashboard', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const institute_id = req.user.institute_id;

    const [[classes]] = await pool.execute(
      'SELECT COUNT(*) as total FROM classes WHERE teacher_id = ? AND is_active = 1',
      [teacher_id]
    );
    const [[students]] = await pool.execute(
      `SELECT COUNT(DISTINCT ce.student_id) as total FROM class_enrollments ce
       JOIN classes c ON ce.class_id = c.id
       WHERE c.teacher_id = ? AND ce.is_active = 1`,
      [teacher_id]
    );
    const today = new Date().toISOString().split('T')[0];
    const [[todayAttendance]] = await pool.execute(
      `SELECT COUNT(*) as total FROM attendance a
       JOIN classes c ON a.class_id = c.id
       WHERE c.teacher_id = ? AND a.date = ? AND a.status = 'present'`,
      [teacher_id, today]
    );
    const [[unreadMessages]] = await pool.execute(
      'SELECT COUNT(*) as total FROM message_recipients WHERE recipient_id = ? AND is_read = 0',
      [teacher_id]
    );

    res.json({
      success: true,
      data: {
        total_classes: classes.total,
        total_students: students.total,
        today_attendance: todayAttendance.total,
        unread_messages: unreadMessages.total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get teacher's classes
router.get('/classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const [classes] = await pool.execute(
      `SELECT c.*, COUNT(DISTINCT ce.student_id) as student_count
       FROM classes c
       LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = 1
       WHERE c.teacher_id = ? AND c.is_active = 1
       GROUP BY c.id`,
      [teacher_id]
    );
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get attendance summary for teacher's classes
router.get('/reports/attendance', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { class_id, month } = req.query;

    let query = `SELECT a.*, u.name as student_name, c.name as class_name
                 FROM attendance a
                 JOIN users u ON a.student_id = u.id
                 JOIN classes c ON a.class_id = c.id
                 WHERE c.teacher_id = ?`;
    const params = [teacher_id];

    if (class_id) { query += ' AND a.class_id = ?'; params.push(class_id); }
    if (month) { query += ' AND DATE_FORMAT(a.date, "%Y-%m") = ?'; params.push(month); }
    query += ' ORDER BY a.date DESC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get payment status for teacher's classes
router.get('/reports/payments', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { month } = req.query;

    let query = `SELECT p.*, u.name as student_name, c.name as class_name
                 FROM payments p
                 JOIN users u ON p.student_id = u.id
                 JOIN classes c ON p.class_id = c.id
                 WHERE c.teacher_id = ?`;
    const params = [teacher_id];

    if (month) { query += ' AND p.month = ?'; params.push(month); }
    query += ' ORDER BY p.month DESC, u.name';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
