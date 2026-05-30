const prisma = require('../config/prisma');

exports.getInstitutesList = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const institutes = await prisma.institute.findMany({
      where: { id: institute_id, is_active: true },
      select: { id: true, name: true, institute_code: true },
    });
    res.json({ success: true, data: institutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const today = new Date(new Date().toISOString().split('T')[0]);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [studentsCount, teachersCount, classesCount, todayAttendanceCount, monthlyIncomeData, pendingFeesCount] =
      await Promise.all([
        prisma.user.count({ where: { institute_id, role: 'student', is_active: true } }),
        prisma.user.count({ where: { institute_id, role: 'teacher', is_active: true } }),
        prisma.class.count({ where: { institute_id, is_active: true } }),
        prisma.attendance.count({ where: { class: { institute_id }, date: today, status: 'present' } }),
        prisma.payment.aggregate({
          where: { institute_id, status: 'paid', paid_date: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { amount: true },
        }),
        prisma.payment.count({ where: { institute_id, status: { in: ['pending', 'overdue'] } } }),
      ]);

    res.json({
      success: true,
      data: {
        total_students: studentsCount,
        total_teachers: teachersCount,
        total_classes: classesCount,
        today_attendance: todayAttendanceCount,
        monthly_income: monthlyIncomeData._sum.amount || 0,
        pending_fees: pendingFeesCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const students = await prisma.user.findMany({
      where: { institute_id, role: 'student', is_active: true },
      include: {
        enrollments: {
          where: { is_active: true },
          include: { class: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = students.map((s) => {
      const { enrollments, ...rest } = s;
      return { ...rest, classes: enrollments.map((e) => e.class.name).join(', ') };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const teachers = await prisma.user.findMany({
      where: { institute_id, role: 'teacher', is_active: true },
      include: {
        taught_classes: { where: { is_active: true }, select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = teachers.map((t) => {
      const { taught_classes, ...rest } = t;
      return { ...rest, classes: taught_classes.map((c) => c.name).join(', ') };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const classes = await prisma.class.findMany({
      where: { institute_id, is_active: true },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { enrollments: { where: { is_active: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    const data = classes.map((c) => {
      const { teacher, _count, ...rest } = c;
      return { ...rest, teacher_name: teacher?.name || null, student_count: _count.enrollments };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createClass = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { name, grade, al_year, class_day, start_time, end_time, monthly_fee, class_type, teacher_id } = req.body;
    const isAL = grade && (grade.trim() === 'A/L' || grade.trim() === 'A/L Revision');

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Class name is required.' });
    if (!grade?.trim()) return res.status(400).json({ success: false, message: 'Grade/Level is required.' });
    if (isAL && !al_year) return res.status(400).json({ success: false, message: 'A/L Year is required.' });
    if (!class_day?.trim()) return res.status(400).json({ success: false, message: 'Day is required.' });

    const cls = await prisma.class.create({
      data: {
        institute_id,
        teacher_id: teacher_id ? Number(teacher_id) : null,
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

    res.status(201).json({ success: true, message: 'Class created successfully.', data: { id: cls.id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

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

    const existing = await prisma.class.findFirst({ where: { id: Number(id), institute_id, is_active: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.class.update({
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
        teacher_id: teacher_id ? Number(teacher_id) : null,
      },
    });

    res.json({ success: true, message: 'Class updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { id } = req.params;

    const existing = await prisma.class.findFirst({ where: { id: Number(id), institute_id, is_active: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.class.update({ where: { id: Number(id) }, data: { is_active: false } });
    res.json({ success: true, message: 'Class deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const { class_id, student_id } = req.body;
    const institute_id = req.user.institute_id;

    const cls = await prisma.class.findFirst({ where: { id: Number(class_id), institute_id } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.classEnrollment.upsert({
      where: { class_id_student_id: { class_id: Number(class_id), student_id: Number(student_id) } },
      create: { class_id: Number(class_id), student_id: Number(student_id), is_active: true },
      update: { is_active: true },
    });

    if (Number(cls.monthly_fee) > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const existingPayment = await prisma.payment.findFirst({
        where: { student_id: Number(student_id), class_id: Number(class_id), month },
      });
      if (!existingPayment) {
        await prisma.payment.create({
          data: { student_id: Number(student_id), class_id: Number(class_id), institute_id, amount: cls.monthly_fee, month, status: 'pending' },
        });
      }
    }

    res.json({ success: true, message: 'Student enrolled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { class_id, date, month } = req.query;

    const where = { class: { institute_id } };
    if (class_id) where.class_id = Number(class_id);
    if (date) {
      where.date = new Date(date);
    } else if (month) {
      const [year, mon] = month.split('-');
      where.date = { gte: new Date(Number(year), Number(mon) - 1, 1), lte: new Date(Number(year), Number(mon), 0, 23, 59, 59) };
    }

    const rows = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { name: true, student_id: true } },
        class: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
    });

    const data = rows.map((r) => ({
      ...r,
      student_name: r.student.name,
      student_id: r.student.student_id,
      class_name: r.class.name,
      student: undefined,
      class: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getIncomeReport = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { month, class_id } = req.query;

    const where = { institute_id };
    if (month) where.month = month;
    if (class_id) where.class_id = Number(class_id);

    const rows = await prisma.payment.findMany({
      where,
      include: {
        student: { select: { name: true, student_id: true } },
        class: { select: { name: true } },
      },
      orderBy: [{ month: 'desc' }, { student: { name: 'asc' } }],
    });

    const summaryWhere = { institute_id };
    if (month) summaryWhere.month = month;

    const [totalCollectedData, totalPendingData, paidCount, pendingCount] = await Promise.all([
      prisma.payment.aggregate({ where: { ...summaryWhere, status: 'paid' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { ...summaryWhere, status: { in: ['pending', 'overdue'] } }, _sum: { amount: true } }),
      prisma.payment.count({ where: { ...summaryWhere, status: 'paid' } }),
      prisma.payment.count({ where: { ...summaryWhere, status: { in: ['pending', 'overdue'] } } }),
    ]);

    const data = rows.map((r) => ({
      ...r,
      student_name: r.student.name,
      student_id: r.student.student_id,
      class_name: r.class.name,
      student: undefined,
      class: undefined,
    }));

    res.json({
      success: true,
      data,
      summary: {
        total_collected: totalCollectedData._sum.amount || 0,
        total_pending: totalPendingData._sum.amount || 0,
        paid_count: paidCount,
        pending_count: pendingCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
