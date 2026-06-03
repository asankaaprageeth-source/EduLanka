const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { auth, authorize } = require('../middleware/auth');
const { upload, resizeProfilePic } = require('../middleware/upload');
const prisma = require('../config/prisma');

router.get('/dashboard', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const today = new Date(new Date().toISOString().split('T')[0]);

    const [classesCount, uniqueStudents, todayAttendance, unreadMessages] = await Promise.all([
      prisma.class.count({ where: { teacher_id, is_active: true } }),
      prisma.classEnrollment.findMany({
        where: { class: { teacher_id }, is_active: true },
        select: { student_id: true },
        distinct: ['student_id'],
      }),
      prisma.attendance.count({ where: { class: { teacher_id }, date: today, status: 'present' } }),
      prisma.messageRecipient.count({ where: { recipient_id: teacher_id, is_read: false } }),
    ]);

    res.json({
      success: true,
      data: {
        total_classes: classesCount,
        total_students: uniqueStudents.length,
        today_attendance: todayAttendance,
        unread_messages: unreadMessages,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/institutes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const primary_id = req.user.institute_id;

    const ids = new Set();
    if (primary_id) ids.add(primary_id);

    const connections = await prisma.teacherInstituteConnection.findMany({
      where: { teacher_id, status: 'accepted' },
      select: { institute_id: true },
    });
    connections.forEach((c) => ids.add(c.institute_id));

    if (ids.size === 0) return res.json({ success: true, data: [] });

    const institutes = await prisma.institute.findMany({
      where: { id: { in: [...ids] }, is_active: true },
      select: { id: true, name: true, institute_code: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: institutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { institute_id } = req.query;

    const where = { teacher_id, is_active: true };
    if (institute_id) where.institute_id = Number(institute_id);

    const classes = await prisma.class.findMany({
      where,
      include: {
        institute: { select: { name: true } },
        _count: { select: { enrollments: { where: { is_active: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    const data = classes.map((c) => ({
      ...c,
      institute_name: c.institute?.name || null,
      student_count: c._count.enrollments,
      institute: undefined,
      _count: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type, institute_id: bodyInstituteId } = req.body;

    const institute_id = bodyInstituteId ? Number(bodyInstituteId) : req.user.institute_id;
    if (!institute_id) {
      return res.status(400).json({ success: false, message: 'ආයතනය තෝරන්න / Please select an institute.' });
    }

    if (institute_id !== req.user.institute_id) {
      const conn = await prisma.teacherInstituteConnection.findFirst({
        where: { teacher_id, institute_id, status: 'accepted' },
      });
      if (!conn) return res.status(403).json({ success: false, message: 'You are not connected to this institute.' });
    }

    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Class name is required.' });
    if (!grade?.trim()) return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    if (isAL && (!al_year || isNaN(Number(al_year)))) return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    if (!class_day?.trim()) return res.status(400).json({ success: false, message: 'Day is required.' });
    if (monthly_fee !== undefined && monthly_fee !== '' && Number(monthly_fee) < 0) {
      return res.status(400).json({ success: false, message: 'Class fee must be a positive number.' });
    }

    const cls = await prisma.class.create({
      data: {
        institute_id,
        teacher_id,
        name: name.trim(),
        grade: grade.trim(),
        al_year: isAL ? Number(al_year) : null,
        class_day: class_day.trim(),
        start_time: start_time || null,
        end_time: end_time || null,
        monthly_fee: monthly_fee || 0,
        class_type: class_type || 'hall',
      },
    });

    res.status(201).json({ success: true, data: cls, message: 'Class created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/classes/:id', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type } = req.body;
    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Class name is required.' });
    if (!grade?.trim()) return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    if (isAL && (!al_year || isNaN(Number(al_year)))) return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    if (!class_day?.trim()) return res.status(400).json({ success: false, message: 'Day is required.' });
    if (monthly_fee !== undefined && monthly_fee !== '' && Number(monthly_fee) < 0) {
      return res.status(400).json({ success: false, message: 'Class fee must be a positive number.' });
    }

    const existing = await prisma.class.findFirst({ where: { id: Number(id), teacher_id, is_active: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Class not found.' });

    const updated = await prisma.class.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        grade: grade.trim(),
        al_year: isAL ? Number(al_year) : null,
        class_day: class_day.trim(),
        start_time: start_time || null,
        end_time: end_time || null,
        monthly_fee: monthly_fee || 0,
        class_type: class_type || 'hall',
      },
    });

    res.json({ success: true, data: updated, message: 'Class updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.delete('/classes/:id', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;

    const existing = await prisma.class.findFirst({ where: { id: Number(id), teacher_id, is_active: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.class.update({ where: { id: Number(id) }, data: { is_active: false } });
    res.json({ success: true, message: 'Class deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/institute-students', auth, authorize('teacher'), async (req, res) => {
  try {
    const institute_id = req.user.institute_id;

    const students = await prisma.user.findMany({
      where: { institute_id, role: 'student', is_active: true },
      select: { id: true, name: true, student_id: true, phone: true, photo: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/classes/:id/students', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;

    const cls = await prisma.class.findFirst({ where: { id: Number(id), teacher_id, is_active: true } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: Number(id), is_active: true },
      include: { student: { select: { id: true, name: true, student_id: true, phone: true, photo: true } } },
      orderBy: { student: { name: 'asc' } },
    });

    const data = enrollments.map((e) => ({ ...e.student, enrolled_date: e.enrolled_date }));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/classes/:id/enroll', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const institute_id = req.user.institute_id;
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required.' });

    const cls = await prisma.class.findFirst({
      where: { id: Number(id), teacher_id, is_active: true },
      select: { id: true, monthly_fee: true },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const student = await prisma.user.findFirst({
      where: { id: Number(student_id), institute_id, role: 'student', is_active: true },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    await prisma.classEnrollment.upsert({
      where: { class_id_student_id: { class_id: cls.id, student_id: student.id } },
      create: { class_id: cls.id, student_id: student.id, is_active: true },
      update: { is_active: true },
    });

    if (Number(cls.monthly_fee) > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const existing = await prisma.payment.findFirst({ where: { student_id: student.id, class_id: cls.id, month } });
      if (!existing) {
        await prisma.payment.create({
          data: { student_id: student.id, class_id: cls.id, institute_id, amount: cls.monthly_fee, month, status: 'pending' },
        });
      }
    }

    res.json({ success: true, message: 'Student enrolled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.delete('/classes/:id/students/:student_id', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id, student_id } = req.params;

    const cls = await prisma.class.findFirst({ where: { id: Number(id), teacher_id, is_active: true } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.classEnrollment.updateMany({
      where: { class_id: Number(id), student_id: Number(student_id) },
      data: { is_active: false },
    });

    res.json({ success: true, message: 'Student removed from class.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/classes/:id/report/attendance', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { id } = req.params;
    const { month } = req.query;

    const cls = await prisma.class.findFirst({ where: { id: Number(id), teacher_id, is_active: true } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: Number(id), is_active: true },
      include: { student: { select: { id: true, name: true, student_id: true } } },
      orderBy: { student: { name: 'asc' } },
    });

    const attendanceWhere = { class_id: Number(id) };
    if (month) {
      const [year, mon] = month.split('-');
      attendanceWhere.date = { gte: new Date(Number(year), Number(mon) - 1, 1), lte: new Date(Number(year), Number(mon), 0, 23, 59, 59) };
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: { student_id: true, status: true },
    });

    const byStudent = {};
    for (const a of attendanceRecords) {
      if (!byStudent[a.student_id]) byStudent[a.student_id] = { present: 0, late: 0, absent: 0, total: 0 };
      byStudent[a.student_id].total++;
      byStudent[a.student_id][a.status]++;
    }

    const sessions = await prisma.attendance.groupBy({
      by: ['date'],
      where: attendanceWhere,
    });

    const students = enrollments.map((e) => ({
      student_id: e.student.id,
      student_name: e.student.name,
      student_no: e.student.student_id,
      present_count: byStudent[e.student.id]?.present || 0,
      late_count: byStudent[e.student.id]?.late || 0,
      absent_count: byStudent[e.student.id]?.absent || 0,
      total_marked: byStudent[e.student.id]?.total || 0,
    }));

    res.json({ success: true, data: students, total_sessions: sessions.length, month: month || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/reports/attendance', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { class_id, month } = req.query;

    const where = { class: { teacher_id } };
    if (class_id) where.class_id = Number(class_id);
    if (month) {
      const [year, mon] = month.split('-');
      where.date = { gte: new Date(Number(year), Number(mon) - 1, 1), lte: new Date(Number(year), Number(mon), 0, 23, 59, 59) };
    }

    const rows = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const data = rows.map((r) => ({
      ...r,
      student_name: r.student.name,
      class_name: r.class.name,
      student: undefined,
      class: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/reports/payments', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { month } = req.query;

    const where = { class: { teacher_id } };
    if (month) where.month = month;

    const rows = await prisma.payment.findMany({
      where,
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: [{ month: 'desc' }, { student: { name: 'asc' } }],
    });

    const data = rows.map((r) => ({
      ...r,
      student_name: r.student.name,
      class_name: r.class.name,
      student: undefined,
      class: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/profile/upload-pic', auth, authorize('teacher'), upload.single('photo'), resizeProfilePic, async (req, res) => {
  try {
    if (!req.file?.filename) return res.status(400).json({ success: false, message: 'No image uploaded.' });

    const existing = await prisma.user.findUnique({ where: { id: req.user.id }, select: { photo: true } });
    if (existing?.photo) {
      const oldPath = path.join(__dirname, '../../uploads', existing.photo);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
    }

    await prisma.user.update({ where: { id: req.user.id }, data: { photo: req.file.filename } });
    res.json({ success: true, photo: req.file.filename, message: 'Profile picture updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
