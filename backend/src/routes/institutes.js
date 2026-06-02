const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../config/prisma');

// Search institutes by name or code
router.get('/search', auth, authorize('student'), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ success: true, data: [] });

    const institutes = await prisma.institute.findMany({
      where: {
        is_active: true,
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { institute_code: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, address: true, institute_code: true },
      take: 20,
      orderBy: { name: 'asc' },
    });

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

    const inst = await prisma.institute.findFirst({
      where: { id: Number(id), is_active: true },
      select: { id: true, name: true },
    });
    if (!inst) return res.status(404).json({ success: false, message: 'Institute not found.' });

    const classes = await prisma.class.findMany({
      where: { institute_id: Number(id), is_active: true },
      include: {
        teacher: { select: { name: true } },
        enrollments: { where: { student_id, is_active: true }, select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = classes.map((c) => ({
      id: c.id, name: c.name, grade: c.grade, al_year: c.al_year,
      class_day: c.class_day, start_time: c.start_time, end_time: c.end_time,
      monthly_fee: c.monthly_fee, class_type: c.class_type,
      teacher_name: c.teacher?.name || null,
      already_enrolled: c.enrollments.length > 0 ? 1 : 0,
    }));

    res.json({ success: true, data, institute: inst });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
