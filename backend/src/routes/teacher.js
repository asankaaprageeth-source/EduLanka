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

// Get all institutes this teacher can create classes for
router.get('/institutes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const primary_id = req.user.institute_id;

    const ids = new Set();
    if (primary_id) ids.add(primary_id);

    const [connections] = await pool.execute(
      'SELECT institute_id FROM teacher_institute_connections WHERE teacher_id = ? AND status = "accepted"',
      [teacher_id]
    );
    connections.forEach((c) => ids.add(c.institute_id));

    if (ids.size === 0) return res.json({ success: true, data: [] });

    const idList = [...ids];
    const placeholders = idList.map(() => '?').join(',');
    const [institutes] = await pool.execute(
      `SELECT id, name, institute_code FROM institutes WHERE id IN (${placeholders}) AND is_active = 1 ORDER BY name`,
      idList
    );
    res.json({ success: true, data: institutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get teacher's classes
router.get('/classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { institute_id } = req.query;

    let query = `SELECT c.*, i.name as institute_name, COUNT(DISTINCT ce.student_id) as student_count
       FROM classes c
       LEFT JOIN institutes i ON c.institute_id = i.id
       LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = 1
       WHERE c.teacher_id = ? AND c.is_active = 1`;
    const params = [teacher_id];

    if (institute_id) {
      query += ' AND c.institute_id = ?';
      params.push(Number(institute_id));
    }

    query += ' GROUP BY c.id ORDER BY c.name';
    const [classes] = await pool.execute(query, params);
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Create a new class (teacher creates their own class)
router.post('/classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type, institute_id: bodyInstituteId } = req.body;

    // Resolve and validate institute access
    const institute_id = bodyInstituteId ? Number(bodyInstituteId) : req.user.institute_id;
    if (!institute_id) {
      return res.status(400).json({ success: false, message: 'ආයතනය තෝරන්න / Please select an institute.' });
    }
    if (institute_id !== req.user.institute_id) {
      const [[conn]] = await pool.execute(
        'SELECT id FROM teacher_institute_connections WHERE teacher_id = ? AND institute_id = ? AND status = "accepted"',
        [teacher_id, institute_id]
      );
      if (!conn) return res.status(403).json({ success: false, message: 'You are not connected to this institute.' });
    }

    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Class name is required.' });
    }
    if (!grade || !grade.trim()) {
      return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    }
    if (isAL && (!al_year || isNaN(Number(al_year)))) {
      return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    }
    if (!class_day || !class_day.trim()) {
      return res.status(400).json({ success: false, message: 'Day is required.' });
    }
    if (monthly_fee !== undefined && monthly_fee !== '' && Number(monthly_fee) < 0) {
      return res.status(400).json({ success: false, message: 'Class fee must be a positive number.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO classes (institute_id, teacher_id, name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        institute_id,
        teacher_id,
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

    const [[newClass]] = await pool.execute('SELECT * FROM classes WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newClass, message: 'Class created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Update a class
router.put('/classes/:id', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type } = req.body;

    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Class name is required.' });
    }
    if (!grade || !grade.trim()) {
      return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    }
    if (isAL && (!al_year || isNaN(Number(al_year)))) {
      return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    }
    if (!class_day || !class_day.trim()) {
      return res.status(400).json({ success: false, message: 'Day is required.' });
    }
    if (monthly_fee !== undefined && monthly_fee !== '' && Number(monthly_fee) < 0) {
      return res.status(400).json({ success: false, message: 'Class fee must be a positive number.' });
    }

    const [[existing]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
      [id, teacher_id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    await pool.execute(
      `UPDATE classes SET name = ?, grade = ?, al_year = ?, class_day = ?, start_time = ?, end_time = ?, monthly_fee = ?, class_type = ?
       WHERE id = ? AND teacher_id = ?`,
      [
        name.trim(),
        grade.trim(),
        isAL ? Number(al_year) : null,
        class_day.trim(),
        start_time || null,
        end_time || null,
        monthly_fee || 0,
        class_type || 'hall',
        id,
        teacher_id,
      ]
    );

    const [[updated]] = await pool.execute('SELECT * FROM classes WHERE id = ?', [id]);
    res.json({ success: true, data: updated, message: 'Class updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Delete (soft-delete) a class
router.delete('/classes/:id', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;

    const [[existing]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
      [id, teacher_id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    await pool.execute('UPDATE classes SET is_active = 0 WHERE id = ? AND teacher_id = ?', [id, teacher_id]);
    res.json({ success: true, message: 'Class deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get all students in the teacher's institute (for enrollment selection)
router.get('/institute-students', auth, authorize('teacher'), async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const [students] = await pool.execute(
      `SELECT id, name, student_id, phone, photo
       FROM users
       WHERE institute_id = ? AND role = 'student' AND is_active = 1
       ORDER BY name`,
      [institute_id]
    );
    res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get enrolled students for a specific class
router.get('/classes/:id/students', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;

    const [[cls]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
      [id, teacher_id]
    );
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const [students] = await pool.execute(
      `SELECT u.id, u.name, u.student_id, u.phone, u.photo, ce.enrolled_date
       FROM class_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.class_id = ? AND ce.is_active = 1
       ORDER BY u.name`,
      [id]
    );
    res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Enroll a student in a class
router.post('/classes/:id/enroll', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const institute_id = req.user.institute_id;
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required.' });

    const [[cls]] = await pool.execute(
      'SELECT id, monthly_fee FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
      [id, teacher_id]
    );
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const [[student]] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND institute_id = ? AND role = "student" AND is_active = 1',
      [student_id, institute_id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    await pool.execute(
      'INSERT INTO class_enrollments (class_id, student_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_active = 1',
      [id, student_id]
    );

    if (cls.monthly_fee > 0) {
      const month = new Date().toISOString().slice(0, 7);
      await pool.execute(
        'INSERT IGNORE INTO payments (student_id, class_id, institute_id, amount, month, status) VALUES (?, ?, ?, ?, ?, "pending")',
        [student_id, id, institute_id, cls.monthly_fee, month]
      );
    }

    res.json({ success: true, message: 'Student enrolled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Unenroll a student from a class
router.delete('/classes/:id/students/:student_id', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id, student_id } = req.params;

    const [[cls]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
      [id, teacher_id]
    );
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    await pool.execute(
      'UPDATE class_enrollments SET is_active = 0 WHERE class_id = ? AND student_id = ?',
      [id, student_id]
    );
    res.json({ success: true, message: 'Student removed from class.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Per-student attendance summary for a specific class
router.get('/classes/:id/report/attendance', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;
    const { month } = req.query;

    const [[cls]] = await pool.execute(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ? AND is_active = 1',
      [id, teacher_id]
    );
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const attendanceFilter = month ? 'AND DATE_FORMAT(a.date, "%Y-%m") = ?' : '';
    const studentParams = month
      ? [id, month, id]
      : [id, id];

    const [students] = await pool.execute(
      `SELECT u.id AS student_id, u.name AS student_name, u.student_id AS student_no,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
              SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END) AS late_count,
              SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END) AS absent_count,
              COUNT(a.id) AS total_marked
       FROM class_enrollments ce
       JOIN users u ON ce.student_id = u.id
       LEFT JOIN attendance a ON a.student_id = u.id AND a.class_id = ? ${attendanceFilter}
       WHERE ce.class_id = ? AND ce.is_active = 1
       GROUP BY u.id, u.name, u.student_id
       ORDER BY u.name`,
      studentParams
    );

    const sessionParams = month ? [id, month] : [id];
    const [[{ total_sessions }]] = await pool.execute(
      `SELECT COUNT(DISTINCT date) AS total_sessions
       FROM attendance WHERE class_id = ? ${month ? 'AND DATE_FORMAT(date, "%Y-%m") = ?' : ''}`,
      sessionParams
    );

    res.json({ success: true, data: students, total_sessions: Number(total_sessions), month: month || null });
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
