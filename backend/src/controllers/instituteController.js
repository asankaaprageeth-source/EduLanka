const pool = require('../config/database');

// Get institutes list (returns current institute for institute role)
exports.getInstitutesList = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const [institutes] = await pool.execute(
      'SELECT id, name, institute_code FROM institutes WHERE id = ? AND is_active = 1',
      [institute_id]
    );
    res.json({ success: true, data: institutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get institute dashboard stats
exports.getDashboard = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const today = new Date().toISOString().split('T')[0];

    const [[students]] = await pool.execute(
      'SELECT COUNT(*) as total FROM users WHERE institute_id = ? AND role = "student" AND is_active = 1',
      [institute_id]
    );
    const [[teachers]] = await pool.execute(
      'SELECT COUNT(*) as total FROM users WHERE institute_id = ? AND role = "teacher" AND is_active = 1',
      [institute_id]
    );
    const [[classes]] = await pool.execute(
      'SELECT COUNT(*) as total FROM classes WHERE institute_id = ? AND is_active = 1',
      [institute_id]
    );
    const [[todayAttendance]] = await pool.execute(
      `SELECT COUNT(*) as total FROM attendance a
       JOIN classes c ON a.class_id = c.id
       WHERE c.institute_id = ? AND a.date = ? AND a.status = 'present'`,
      [institute_id, today]
    );
    const [[monthlyIncome]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments
       WHERE institute_id = ? AND status = 'paid' AND DATE_FORMAT(paid_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')`,
      [institute_id]
    );
    const [[pendingFees]] = await pool.execute(
      `SELECT COUNT(*) as total FROM payments WHERE institute_id = ? AND status IN ('pending', 'overdue')`,
      [institute_id]
    );

    res.json({
      success: true,
      data: {
        total_students: students.total,
        total_teachers: teachers.total,
        total_classes: classes.total,
        today_attendance: todayAttendance.total,
        monthly_income: monthlyIncome.total,
        pending_fees: pendingFees.total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get all students
exports.getStudents = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const [students] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.parent_phone, u.photo, u.qr_code, u.student_id, u.created_at,
       GROUP_CONCAT(c.name SEPARATOR ', ') as classes
       FROM users u
       LEFT JOIN class_enrollments ce ON u.id = ce.student_id AND ce.is_active = 1
       LEFT JOIN classes c ON ce.class_id = c.id
       WHERE u.institute_id = ? AND u.role = 'student' AND u.is_active = 1
       GROUP BY u.id
       ORDER BY u.name`,
      [institute_id]
    );
    res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const [teachers] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.photo, u.district, u.subjects, u.created_at,
       GROUP_CONCAT(c.name SEPARATOR ', ') as classes
       FROM users u
       LEFT JOIN classes c ON u.id = c.teacher_id AND c.is_active = 1
       WHERE u.institute_id = ? AND u.role = 'teacher' AND u.is_active = 1
       GROUP BY u.id
       ORDER BY u.name`,
      [institute_id]
    );
    res.json({ success: true, data: teachers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get all classes
exports.getClasses = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const [classes] = await pool.execute(
      `SELECT c.*, u.name as teacher_name,
       COUNT(DISTINCT ce.student_id) as student_count
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = 1
       WHERE c.institute_id = ? AND c.is_active = 1
       GROUP BY c.id
       ORDER BY c.name`,
      [institute_id]
    );
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Create class
exports.createClass = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type, teacher_id } = req.body;

    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Class name is required.' });
    if (!grade?.trim()) return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    if (isAL && !al_year) return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    if (!class_day?.trim()) return res.status(400).json({ success: false, message: 'Day is required.' });

    const [result] = await pool.execute(
      `INSERT INTO classes (institute_id, teacher_id, name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        institute_id,
        teacher_id || null,
        name.trim(),
        grade.trim(),
        isAL ? Number(al_year) : null,
        class_day.trim(),
        start_time || null,
        end_time || null,
        monthly_fee || 0,
        class_type || 'hall',
      ]
    );
    res.status(201).json({ success: true, message: 'Class created successfully.', data: { id: result.insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Update class
exports.updateClass = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { id } = req.params;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type, teacher_id } = req.body;

    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Class name is required.' });
    if (!grade?.trim()) return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    if (isAL && !al_year) return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    if (!class_day?.trim()) return res.status(400).json({ success: false, message: 'Day is required.' });

    const [[existing]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND institute_id = ? AND is_active = 1',
      [id, institute_id]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Class not found.' });

    await pool.execute(
      `UPDATE classes SET name=?, grade=?, al_year=?, class_day=?, start_time=?, end_time=?, monthly_fee=?, class_type=?, teacher_id=?
       WHERE id=? AND institute_id=?`,
      [
        name.trim(),
        grade.trim(),
        isAL ? Number(al_year) : null,
        class_day.trim(),
        start_time || null,
        end_time || null,
        monthly_fee || 0,
        class_type || 'hall',
        teacher_id || null,
        id,
        institute_id,
      ]
    );
    res.json({ success: true, message: 'Class updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Delete class (soft delete)
exports.deleteClass = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { id } = req.params;

    const [[existing]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND institute_id = ? AND is_active = 1',
      [id, institute_id]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Class not found.' });

    await pool.execute('UPDATE classes SET is_active = 0 WHERE id = ? AND institute_id = ?', [id, institute_id]);
    res.json({ success: true, message: 'Class deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Enroll student to class
exports.enrollStudent = async (req, res) => {
  try {
    const { class_id, student_id } = req.body;
    const institute_id = req.user.institute_id;

    const [cls] = await pool.execute('SELECT id FROM classes WHERE id = ? AND institute_id = ?', [class_id, institute_id]);
    if (cls.length === 0) return res.status(404).json({ success: false, message: 'Class not found.' });

    await pool.execute(
      'INSERT INTO class_enrollments (class_id, student_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_active = 1',
      [class_id, student_id]
    );

    const month = new Date().toISOString().slice(0, 7);
    const [cls2] = await pool.execute('SELECT monthly_fee FROM classes WHERE id = ?', [class_id]);
    if (cls2[0].monthly_fee > 0) {
      await pool.execute(
        'INSERT IGNORE INTO payments (student_id, class_id, institute_id, amount, month, status) VALUES (?, ?, ?, ?, ?, "pending")',
        [student_id, class_id, institute_id, cls2[0].monthly_fee, month]
      );
    }

    res.json({ success: true, message: 'Student enrolled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get attendance report
exports.getAttendanceReport = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { class_id, date, month } = req.query;

    let query = `SELECT a.*, u.name as student_name, u.student_id, c.name as class_name
                 FROM attendance a
                 JOIN users u ON a.student_id = u.id
                 JOIN classes c ON a.class_id = c.id
                 WHERE c.institute_id = ?`;
    const params = [institute_id];

    if (class_id) { query += ' AND a.class_id = ?'; params.push(class_id); }
    if (date) { query += ' AND a.date = ?'; params.push(date); }
    if (month) { query += ' AND DATE_FORMAT(a.date, "%Y-%m") = ?'; params.push(month); }

    query += ' ORDER BY a.date DESC, u.name';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get income report
exports.getIncomeReport = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { month, class_id } = req.query;

    let query = `SELECT p.*, u.name as student_name, u.student_id, c.name as class_name
                 FROM payments p
                 JOIN users u ON p.student_id = u.id
                 JOIN classes c ON p.class_id = c.id
                 WHERE p.institute_id = ?`;
    const params = [institute_id];

    if (month) { query += ' AND p.month = ?'; params.push(month); }
    if (class_id) { query += ' AND p.class_id = ?'; params.push(class_id); }

    query += ' ORDER BY p.month DESC, u.name';
    const [rows] = await pool.execute(query, params);

    const [[summary]] = await pool.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status IN ('pending','overdue') THEN amount END), 0) as total_pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status IN ('pending','overdue') THEN 1 END) as pending_count
       FROM payments WHERE institute_id = ? ${month ? 'AND month = ?' : ''}`,
      month ? [institute_id, month] : [institute_id]
    );

    res.json({ success: true, data: rows, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
