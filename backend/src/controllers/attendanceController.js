const pool = require('../config/database');

// Mark attendance by QR scan
exports.markByQR = async (req, res) => {
  try {
    const { qr_data, class_id } = req.body;
    const institute_id = req.user.institute_id;

    let parsed;
    try {
      parsed = JSON.parse(qr_data);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code.' });
    }

    const { userId } = parsed;
    const today = new Date().toISOString().split('T')[0];

    const [cls] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND institute_id = ?',
      [class_id, institute_id]
    );
    if (cls.length === 0) return res.status(404).json({ success: false, message: 'Class not found.' });

    const [enrollment] = await pool.execute(
      'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ? AND is_active = 1',
      [class_id, userId]
    );
    if (enrollment.length === 0) {
      return res.status(400).json({ success: false, message: 'Student not enrolled in this class.' });
    }

    await pool.execute(
      `INSERT INTO attendance (class_id, student_id, date, status, marked_by)
       VALUES (?, ?, ?, 'present', 'qr_scan')
       ON DUPLICATE KEY UPDATE status = 'present', marked_by = 'qr_scan'`,
      [class_id, userId, today]
    );

    const [student] = await pool.execute(
      'SELECT name, student_id FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Attendance marked.',
      data: { student: student[0], date: today, status: 'present' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Mark attendance manually
exports.markManual = async (req, res) => {
  try {
    const { class_id, date, attendance_list } = req.body;
    const institute_id = req.user.institute_id;

    const [cls] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND institute_id = ?',
      [class_id, institute_id]
    );
    if (cls.length === 0) return res.status(404).json({ success: false, message: 'Class not found.' });

    for (const item of attendance_list) {
      await pool.execute(
        `INSERT INTO attendance (class_id, student_id, date, status, marked_by)
         VALUES (?, ?, ?, ?, 'manual')
         ON DUPLICATE KEY UPDATE status = ?, marked_by = 'manual'`,
        [class_id, item.student_id, date, item.status, item.status]
      );
    }

    res.json({ success: true, message: 'Attendance saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get class students for attendance
exports.getClassStudents = async (req, res) => {
  try {
    const { class_id } = req.params;
    const { date } = req.query;
    const institute_id = req.user.institute_id;
    const checkDate = date || new Date().toISOString().split('T')[0];

    const [students] = await pool.execute(
      `SELECT u.id, u.name, u.student_id, u.photo,
       COALESCE(a.status, 'absent') as today_status
       FROM class_enrollments ce
       JOIN users u ON ce.student_id = u.id
       LEFT JOIN attendance a ON a.student_id = u.id AND a.class_id = ? AND a.date = ?
       WHERE ce.class_id = ? AND ce.is_active = 1
       ORDER BY u.name`,
      [class_id, checkDate, class_id]
    );

    res.json({ success: true, data: students, date: checkDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
