const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/database');

// Student dashboard
router.get('/dashboard', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const institute_id = req.user.institute_id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [[classes]] = await pool.execute(
      'SELECT COUNT(*) as total FROM class_enrollments WHERE student_id = ? AND is_active = 1',
      [student_id]
    );
    const [[pendingFees]] = await pool.execute(
      'SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as amount FROM payments WHERE student_id = ? AND status IN ("pending", "overdue")',
      [student_id]
    );
    const [[thisMonthAttendance]] = await pool.execute(
      `SELECT COUNT(*) as present FROM attendance
       WHERE student_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND status = 'present'`,
      [student_id, currentMonth]
    );
    const [[unreadMessages]] = await pool.execute(
      'SELECT COUNT(*) as total FROM message_recipients WHERE recipient_id = ? AND is_read = 0',
      [student_id]
    );

    res.json({
      success: true,
      data: {
        total_classes: classes.total,
        pending_fees_count: pendingFees.total,
        pending_fees_amount: pendingFees.amount,
        this_month_attendance: thisMonthAttendance.present,
        unread_messages: unreadMessages.total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get student's attendance
router.get('/attendance', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const { month, class_id } = req.query;

    let query = `SELECT a.date, a.status, c.name as class_name, a.marked_by
                 FROM attendance a
                 JOIN classes c ON a.class_id = c.id
                 WHERE a.student_id = ?`;
    const params = [student_id];

    if (month) { query += ' AND DATE_FORMAT(a.date, "%Y-%m") = ?'; params.push(month); }
    if (class_id) { query += ' AND a.class_id = ?'; params.push(class_id); }
    query += ' ORDER BY a.date DESC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get student's classes
router.get('/classes', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const [classes] = await pool.execute(
      `SELECT c.id, c.name, c.grade, c.subject, c.monthly_fee, c.schedule,
       u.name as teacher_name
       FROM class_enrollments ce
       JOIN classes c ON ce.class_id = c.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE ce.student_id = ? AND ce.is_active = 1`,
      [student_id]
    );
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
