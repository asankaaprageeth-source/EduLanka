const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { recordPayment, generateMonthlyFees, getStudentPayments, updateOverdue } = require('../controllers/paymentController');

router.post('/record', auth, authorize('institute'), recordPayment);
router.post('/generate', auth, authorize('institute'), generateMonthlyFees);
router.get('/student', auth, authorize('student'), getStudentPayments);
router.get('/student/:student_id', auth, authorize('institute', 'teacher'), getStudentPayments);
router.post('/update-overdue', auth, authorize('institute'), updateOverdue);

// Get payments for a specific class (teacher/institute)
router.get('/class/:class_id', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const { month } = req.query;
    const institute_id = req.user.institute_id;

    if (req.user.role === 'teacher') {
      const [[cls]] = await pool.execute(
        'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
        [class_id, req.user.id]
      );
      if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    let query = `SELECT p.*, u.name AS student_name, u.student_id AS student_no
                 FROM payments p
                 JOIN users u ON p.student_id = u.id
                 WHERE p.class_id = ? AND p.institute_id = ?`;
    const params = [class_id, institute_id];

    if (month) { query += ' AND p.month = ?'; params.push(month); }
    query += ' ORDER BY u.name, p.month DESC';

    const [payments] = await pool.execute(query, params);

    const summary = payments.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        acc[`${p.status}_amount`] = (acc[`${p.status}_amount`] || 0) + Number(p.amount);
        return acc;
      },
      {}
    );

    res.json({ success: true, data: payments, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Generate monthly fee records for a teacher's class
router.post('/class/:class_id/generate', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const { month } = req.body;
    const institute_id = req.user.institute_id;

    if (!month) return res.status(400).json({ success: false, message: 'Month is required.' });

    const [[cls]] = await pool.execute(
      'SELECT id, monthly_fee FROM classes WHERE id = ? AND institute_id = ?',
      [class_id, institute_id]
    );
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (Number(cls.monthly_fee) <= 0) {
      return res.status(400).json({ success: false, message: 'This class has no monthly fee set.' });
    }

    const [students] = await pool.execute(
      'SELECT student_id FROM class_enrollments WHERE class_id = ? AND is_active = 1',
      [class_id]
    );
    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No enrolled students in this class.' });
    }

    for (const s of students) {
      await pool.execute(
        `INSERT IGNORE INTO payments (student_id, class_id, institute_id, amount, month, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [s.student_id, class_id, institute_id, cls.monthly_fee, month]
      );
    }

    res.json({ success: true, message: `Fee records generated for ${students.length} students.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Mark a student payment as paid
router.post('/class/:class_id/record', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const { student_id, amount, month, notes } = req.body;
    const institute_id = req.user.institute_id;

    if (!student_id || !amount || !month) {
      return res.status(400).json({ success: false, message: 'student_id, amount and month are required.' });
    }

    const receipt_no = `REC${Date.now()}`;
    const paid_date = new Date().toISOString().split('T')[0];

    await pool.execute(
      `INSERT INTO payments (student_id, class_id, institute_id, amount, month, paid_date, receipt_no, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?)
       ON DUPLICATE KEY UPDATE amount = ?, paid_date = ?, receipt_no = ?, status = 'paid', notes = ?`,
      [student_id, class_id, institute_id, amount, month, paid_date, receipt_no, notes || null,
       amount, paid_date, receipt_no, notes || null]
    );

    res.json({ success: true, message: 'Payment recorded.', data: { receipt_no, paid_date } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
