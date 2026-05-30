const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/database');

// Search institutes by name or code
router.get('/search', auth, authorize('student'), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, data: [] });
    }
    const term = `%${q.trim()}%`;
    const [institutes] = await pool.execute(
      `SELECT id, name, address, institute_code FROM institutes
       WHERE is_active = 1 AND (name LIKE ? OR institute_code LIKE ?)
       ORDER BY name LIMIT 20`,
      [term, term]
    );
    res.json({ success: true, data: institutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get available classes of an institute (with enrollment status for the student)
router.get('/:id/classes', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const { id } = req.params;

    const [[inst]] = await pool.execute(
      'SELECT id, name FROM institutes WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!inst) return res.status(404).json({ success: false, message: 'Institute not found.' });

    const [classes] = await pool.execute(
      `SELECT c.id, c.name, c.grade, c.al_year, c.class_day, c.start_time, c.end_time,
       c.monthly_fee, c.class_type, u.name as teacher_name,
       EXISTS(
         SELECT 1 FROM class_enrollments ce2
         WHERE ce2.class_id = c.id AND ce2.student_id = ? AND ce2.is_active = 1
       ) as already_enrolled
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.institute_id = ? AND c.is_active = 1
       ORDER BY c.name`,
      [student_id, id]
    );
    res.json({ success: true, data: classes, institute: inst });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
