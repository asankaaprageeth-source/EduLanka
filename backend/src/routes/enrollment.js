const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const fs = require('fs');

const canManage = (req, res, next) => {
  if (!['institute', 'teacher'].includes(req.user?.role))
    return res.status(403).json({ success: false, message: 'Access denied.' });
  next();
};

// Find student by student_id or QR data
router.post('/find-student', auth, canManage, async (req, res) => {
  try {
    const { query } = req.body;
    let studentId = query?.trim();
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
        student_id: true, photo: true, qr_code: true, institute_id: true,
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

// Register a brand new student and optionally enroll in classes
router.post('/register-and-enroll', auth, canManage, async (req, res) => {
  try {
    const { role, id: actorId } = req.user;
    const { name, email, phone, parent_phone, district, city, village, password, class_ids } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required.' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    // Determine institute_id
    let institute_id = null;
    if (role === 'institute') {
      institute_id = actorId;
    } else if (role === 'teacher') {
      const teacher = await prisma.user.findUnique({ where: { id: actorId }, select: { institute_id: true } });
      institute_id = teacher?.institute_id || null;
    }

    // Check email uniqueness if provided
    if (email?.trim()) {
      const existing = await prisma.user.findFirst({ where: { email: email.trim() } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const student_id = `STU${Date.now()}`;

    const student = await prisma.user.create({
      data: {
        institute_id,
        role: 'student',
        name: name.trim(),
        email: email?.trim() || null,
        password: hashedPassword,
        phone: phone?.trim() || null,
        parent_phone: parent_phone?.trim() || null,
        district: district?.trim() || null,
        city: city?.trim() || null,
        village: village?.trim() || null,
        student_id,
      }
    });

    // Generate QR code
    fs.mkdirSync('./uploads', { recursive: true });
    const qrData = JSON.stringify({ userId: student.id, student_id, institute_id });
    await QRCode.toFile(`./uploads/qr_${student.id}.png`, qrData);
    await prisma.user.update({ where: { id: student.id }, data: { qr_code: `qr_${student.id}.png` } });

    // Enroll in classes if provided
    const enrolledClasses = [];
    if (class_ids && class_ids.length > 0) {
      for (const class_id of class_ids) {
        try {
          const cls = await prisma.class.findUnique({ where: { id: parseInt(class_id) } });
          if (!cls) continue;
          if (role === 'institute' && cls.institute_id !== actorId) continue;
          if (role === 'teacher' && cls.teacher_id !== actorId) continue;

          await prisma.classEnrollment.create({
            data: { class_id: parseInt(class_id), student_id: student.id }
          });
          enrolledClasses.push(cls.name);
        } catch {}
      }
    }

    res.status(201).json({
      success: true,
      message: `Student registered successfully${enrolledClasses.length ? ` and enrolled in ${enrolledClasses.join(', ')}` : ''}.`,
      data: { id: student.id, name: student.name, student_id, email: student.email, enrolledClasses }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get available classes
router.get('/available-classes', auth, canManage, async (req, res) => {
  try {
    const { role, id } = req.user;
    const where = role === 'institute'
      ? { institute_id: id, is_active: true }
      : { teacher_id: id, is_active: true };

    const classes = await prisma.class.findMany({
      where,
      select: {
        id: true, name: true, subject: true, grade: true,
        monthly_fee: true, class_day: true, start_time: true, end_time: true,
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

// Enroll existing student to class
router.post('/enroll', auth, canManage, async (req, res) => {
  try {
    const { student_id, class_id } = req.body;
    const { role, id } = req.user;

    const cls = await prisma.class.findUnique({ where: { id: parseInt(class_id) } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (role === 'institute' && cls.institute_id !== id)
      return res.status(403).json({ success: false, message: 'Not your class.' });
    if (role === 'teacher' && cls.teacher_id !== id)
      return res.status(403).json({ success: false, message: 'Not your class.' });

    const existing = await prisma.classEnrollment.findUnique({
      where: { class_id_student_id: { class_id: parseInt(class_id), student_id: parseInt(student_id) } }
    });
    if (existing) {
      if (existing.is_active) return res.status(400).json({ success: false, message: 'Student already enrolled.' });
      await prisma.classEnrollment.update({ where: { id: existing.id }, data: { is_active: true, enrolled_date: new Date() } });
      return res.json({ success: true, message: 'Student re-enrolled successfully.' });
    }

    await prisma.classEnrollment.create({
      data: { class_id: parseInt(class_id), student_id: parseInt(student_id) }
    });

    if (cls.institute_id) {
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

// GET /api/enrollment/unenrolled-students - students in institute but not in specific class
router.get('/unenrolled-students', auth, canManage, async (req, res) => {
  try {
    const { role, id } = req.user;
    const { class_id } = req.query;

    let institute_id = null;
    if (role === 'institute') {
      institute_id = id;
    } else {
      const teacher = await prisma.user.findUnique({ where: { id }, select: { institute_id: true } });
      institute_id = teacher?.institute_id;
    }

    if (!institute_id) return res.json({ success: true, data: [] });

    const allStudents = await prisma.user.findMany({
      where: { institute_id, role: 'student', is_active: true },
      select: {
        id: true, name: true, email: true, phone: true,
        student_id: true, photo: true, qr_code: true,
        enrollments: {
          where: { is_active: true },
          select: { class_id: true, class: { select: { id: true, name: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    let result = allStudents;
    if (class_id) {
      result = allStudents.filter(s =>
        !s.enrollments.some(e => e.class_id === parseInt(class_id))
      );
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
