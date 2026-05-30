const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../config/prisma');

router.get('/dashboard', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [classesCount, pendingFeesData, thisMonthAttendance, unreadMessages, studentInfo] = await Promise.all([
      prisma.classEnrollment.count({ where: { student_id, is_active: true } }),
      prisma.payment.aggregate({
        where: { student_id, status: { in: ['pending', 'overdue'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.attendance.count({
        where: { student_id, date: { gte: startOfMonth, lte: endOfMonth }, status: 'present' },
      }),
      prisma.messageRecipient.count({ where: { recipient_id: student_id, is_read: false } }),
      prisma.user.findUnique({ where: { id: student_id }, select: { student_id: true } }),
    ]);

    res.json({
      success: true,
      data: {
        student_id: studentInfo?.student_id || null,
        total_classes: classesCount,
        pending_fees_count: pendingFeesData._count,
        pending_fees_amount: pendingFeesData._sum.amount || 0,
        this_month_attendance: thisMonthAttendance,
        unread_messages: unreadMessages,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/attendance', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const { month, class_id } = req.query;

    const where = { student_id };
    if (month) {
      const [year, mon] = month.split('-');
      where.date = { gte: new Date(Number(year), Number(mon) - 1, 1), lte: new Date(Number(year), Number(mon), 0, 23, 59, 59) };
    }
    if (class_id) where.class_id = Number(class_id);

    const rows = await prisma.attendance.findMany({
      where,
      include: { class: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const data = rows.map((r) => ({
      date: r.date,
      status: r.status,
      class_name: r.class.name,
      marked_by: r.marked_by,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/classes', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;

    const enrollments = await prisma.classEnrollment.findMany({
      where: { student_id, is_active: true },
      include: {
        class: {
          include: {
            teacher: { select: { name: true } },
            institute: { select: { name: true } },
          },
        },
      },
      orderBy: { class: { name: 'asc' } },
    });

    const data = enrollments.map((ce) => ({
      id: ce.class.id,
      name: ce.class.name,
      grade: ce.class.grade,
      al_year: ce.class.al_year,
      class_day: ce.class.class_day,
      start_time: ce.class.start_time,
      end_time: ce.class.end_time,
      monthly_fee: ce.class.monthly_fee,
      class_type: ce.class.class_type,
      teacher_name: ce.class.teacher?.name || null,
      institute_name: ce.class.institute?.name || null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/classes/join', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ success: false, message: 'classId is required.' });

    const cls = await prisma.class.findFirst({
      where: { id: Number(classId), is_active: true },
      select: { id: true, institute_id: true, monthly_fee: true },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.classEnrollment.upsert({
      where: { class_id_student_id: { class_id: cls.id, student_id } },
      create: { class_id: cls.id, student_id, is_active: true },
      update: { is_active: true },
    });

    if (Number(cls.monthly_fee) > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const existing = await prisma.payment.findFirst({ where: { student_id, class_id: cls.id, month } });
      if (!existing) {
        await prisma.payment.create({
          data: { student_id, class_id: cls.id, institute_id: cls.institute_id, amount: cls.monthly_fee, month, status: 'pending' },
        });
      }
    }

    res.json({ success: true, message: 'Successfully joined the class.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.delete('/classes/:classId', auth, authorize('student'), async (req, res) => {
  try {
    const student_id = req.user.id;
    const { classId } = req.params;

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { class_id: Number(classId), student_id, is_active: true },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found.' });

    await prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: { is_active: false },
    });

    res.json({ success: true, message: 'Left class successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
