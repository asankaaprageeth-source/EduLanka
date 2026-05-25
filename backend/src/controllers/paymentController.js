const pool = require('../config/database');

// Record a payment
exports.recordPayment = async (req, res) => {
  try {
    const { student_id, class_id, amount, month, notes } = req.body;
    const institute_id = req.user.institute_id;

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
};

// Generate monthly fee records for a class
exports.generateMonthlyFees = async (req, res) => {
  try {
    const { class_id, month } = req.body;
    const institute_id = req.user.institute_id;

    const [cls] = await pool.execute(
      'SELECT id, monthly_fee FROM classes WHERE id = ? AND institute_id = ?',
      [class_id, institute_id]
    );
    if (cls.length === 0) return res.status(404).json({ success: false, message: 'Class not found.' });

    const [students] = await pool.execute(
      'SELECT student_id FROM class_enrollments WHERE class_id = ? AND is_active = 1',
      [class_id]
    );

    for (const s of students) {
      await pool.execute(
        `INSERT IGNORE INTO payments (student_id, class_id, institute_id, amount, month, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [s.student_id, class_id, institute_id, cls[0].monthly_fee, month]
      );
    }

    res.json({ success: true, message: `Fee records generated for ${students.length} students.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get student payment history
exports.getStudentPayments = async (req, res) => {
  try {
    const student_id = req.user.role === 'student' ? req.user.id : req.params.student_id;
    const institute_id = req.user.institute_id;

    const [payments] = await pool.execute(
      `SELECT p.*, c.name as class_name FROM payments p
       JOIN classes c ON p.class_id = c.id
       WHERE p.student_id = ? AND p.institute_id = ?
       ORDER BY p.month DESC`,
      [student_id, institute_id]
    );
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Update overdue statuses
exports.updateOverdue = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    await pool.execute(
      `UPDATE payments SET status = 'overdue'
       WHERE status = 'pending' AND month < ?`,
      [currentMonth]
    );
    res.json({ success: true, message: 'Overdue statuses updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
