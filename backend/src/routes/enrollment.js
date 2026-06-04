const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../config/prisma');

const canManage = (req, res, next) => {
  if (!['institute', 'teacher'].includes(req.user?.role))
    return res.status(403).json({ success: false, message: 'Access denied.' });
  next();
};

// Find student by student_id or QR data
router.post('/find-student', auth, canManage, async (req, res) => {
  try {
    const { query } = req.body; // student_id string or QR JSON string
    let studentId = query?.trim();

    // If QR JSON, extract userId
    let userIdFromQR = null;
    try {
      const parsed = JSON.parse(studentId);
      if (parsed.userId) userIdFromQR = parseInt(parsed.userId);
      if (parsed.student_id) studentId = parsed.student_id;
    } catch {}

    const where = userIdFromQR
      ? { id: userIdFromQR, role: 'student', is_active: true }
      : { student_id: studentId, role: 'student', is_active: true };

    const student = await prisma.user.findFirst({
      where,
      select: {
        id: true, name: true, email: true, phone: true,
        student_id: true, photo: true, qr_code: true,
        institute_id: true,
        enrollments: {
          where: { is_active: true },
          select: { class_id: true, class: { select: { name: true, subject: true } } }
        }
      }
    });

    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get classes available for enrollment (institute's classes or teacher's classes)
router.get('/available-classes', auth, canManage, async (req, res) => {
  try {
    const { role, id, institute_id } = req.user;
    const where = role === 'institute'
      ? { institute_id: id, is_active: true }
      : { teacher_id: id, is_active: true };

    const classes = await prisma.class.findMany({
      where,
      select: {
        id: true, name: true, subject: true, grade: true,
        monthly_fee: true, schedule: true, class_day: true,
        start_time: true, end_time: true,
        _count: { select: { enrollments: { where: { is_active: true } } } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Enroll student to class
router.post('/enroll', auth, canManage, async (req, res) => {
  try {
    const { student_id, class_id } = req.body;
    const { role, id, institute_id } = req.user;

    const cls = await prisma.class.findUnique({ where: { id: parseInt(class_id) } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Verify ownership
    if (role === 'institute' && cls.institute_id !== id)
      return res.status(403).json({ success: false, message: 'Not your class.' });
    if (role === 'teacher' && cls.teacher_id !== id)
      return res.status(403).json({ success: false, message: 'Not your class.' });

    const student = await prisma.user.findUnique({ where: { id: parseInt(student_id) } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Check existing enrollment
    const existing = await prisma.classEnrollment.findUnique({
      where: { class_id_student_id: { class_id: parseInt(class_id), student_id: parseInt(student_id) } }
    });

    if (existing) {
      if (existing.is_active) return res.status(400).json({ success: false, message: 'Student already enrolled in this class.' });
      // Re-activate
      await prisma.classEnrollment.update({
        where: { id: existing.id },
        data: { is_active: true, enrolled_date: new Date() }
      });
      return res.json({ success: true, message: 'Student re-enrolled successfully.' });
    }

    await prisma.classEnrollment.create({
      data: { class_id: parseInt(class_id), student_id: parseInt(student_id) }
    });

    // Update student institute_id if not set
    if (!student.institute_id && cls.institute_id) {
      await prisma.user.update({ where: { id: parseInt(student_id) }, data: { institute_id: cls.institute_id } });
    }

    res.json({ success: true, message: 'Student enrolled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Remove student from class
router.delete('/enroll', auth, canManage, async (req, res) => {
  try {
    const { student_id, class_id } = req.body;
    await prisma.classEnrollment.updateMany({
      where: { class_id: parseInt(class_id), student_id: parseInt(student_id) },
      data: { is_active: false }
    });
    res.json({ success: true, message: 'Student removed from class.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
