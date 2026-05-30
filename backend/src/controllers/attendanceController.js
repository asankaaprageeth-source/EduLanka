const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const prisma = require('../config/prisma');

exports.markByQR = async (req, res) => {
  try {
    const { qr_data, class_id } = req.body;
    const institute_id = req.user.institute_id;

    let parsed;
    try { parsed = JSON.parse(qr_data); } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code.' });
    }

    const { userId } = parsed;
    const today = new Date(new Date().toISOString().split('T')[0]);

    const cls = await prisma.class.findFirst({ where: { id: Number(class_id), institute_id } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { class_id: Number(class_id), student_id: Number(userId), is_active: true },
    });
    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'Student not enrolled in this class.' });
    }

    await prisma.attendance.upsert({
      where: { class_id_student_id_date: { class_id: Number(class_id), student_id: Number(userId), date: today } },
      create: { class_id: Number(class_id), student_id: Number(userId), date: today, status: 'present', marked_by: 'qr_scan' },
      update: { status: 'present', marked_by: 'qr_scan' },
    });

    const student = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { name: true, student_id: true },
    });

    res.json({ success: true, message: 'Attendance marked.', data: { student, date: today, status: 'present' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.markByQRAuto = async (req, res) => {
  try {
    const { qr_data, class_id } = req.body;
    const institute_id = req.user.institute_id;

    let parsed;
    try { parsed = JSON.parse(qr_data); } catch {
      return res.status(400).json({ success: false, status: 'invalid_qr', message: 'Invalid QR code.' });
    }

    const { userId } = parsed;
    if (!userId) return res.json({ success: false, status: 'not_found' });

    const student = await prisma.user.findFirst({
      where: { id: Number(userId), role: 'student', is_active: true },
      select: { id: true, name: true, student_id: true },
    });
    if (!student) return res.json({ success: false, status: 'not_found' });

    const today = new Date(new Date().toISOString().split('T')[0]);
    const markedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (class_id) {
      const cls = await prisma.class.findFirst({
        where: { id: Number(class_id), institute_id, is_active: true },
        select: { id: true, name: true },
      });
      if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

      const enrollment = await prisma.classEnrollment.findFirst({
        where: { class_id: Number(class_id), student_id: Number(userId), is_active: true },
      });
      if (!enrollment) {
        return res.json({ success: false, status: 'not_enrolled', studentName: student.name, studentId: student.id, className: cls.name, classId: cls.id });
      }

      const existing = await prisma.attendance.findUnique({
        where: { class_id_student_id_date: { class_id: Number(class_id), student_id: Number(userId), date: today } },
      });
      if (existing) return res.json({ success: true, status: 'already_marked', studentName: student.name, className: cls.name });

      await prisma.attendance.create({
        data: { class_id: Number(class_id), student_id: Number(userId), date: today, status: 'present', marked_by: 'qr_scan' },
      });
      return res.json({ success: true, status: 'marked', studentName: student.name, studentId: student.id, className: cls.name, classId: Number(class_id), markedAt });
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = DAYS[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    const enrolledClasses = await prisma.class.findMany({
      where: {
        institute_id,
        class_day: currentDay,
        is_active: true,
        enrollments: { some: { student_id: Number(userId), is_active: true } },
      },
      select: { id: true, name: true, start_time: true, end_time: true },
    });

    const activeClasses = enrolledClasses.filter((c) => {
      const startOk = !c.start_time || c.start_time <= currentTime;
      const endOk = !c.end_time || c.end_time >= currentTime;
      return startOk && endOk;
    });

    if (activeClasses.length === 0) {
      return res.json({ success: false, status: 'no_active_class', studentName: student.name, studentId: student.id });
    }
    if (activeClasses.length > 1) {
      return res.json({ success: false, status: 'multiple_classes', studentName: student.name, studentId: student.id, classes: activeClasses });
    }

    const cls = activeClasses[0];
    const existing = await prisma.attendance.findUnique({
      where: { class_id_student_id_date: { class_id: cls.id, student_id: Number(userId), date: today } },
    });
    if (existing) return res.json({ success: true, status: 'already_marked', studentName: student.name, className: cls.name });

    await prisma.attendance.create({
      data: { class_id: cls.id, student_id: Number(userId), date: today, status: 'present', marked_by: 'qr_scan' },
    });
    return res.json({ success: true, status: 'marked', studentName: student.name, studentId: student.id, className: cls.name, classId: cls.id, markedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getTodayLog = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const today = new Date(new Date().toISOString().split('T')[0]);

    const records = await prisma.attendance.findMany({
      where: { class: { institute_id }, date: today, status: 'present' },
      include: {
        student: { select: { id: true, name: true, student_id: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { id: 'desc' },
    });

    const data = records.map((r) => ({
      id: r.id,
      student_db_id: r.student.id,
      student_name: r.student.name,
      student_id: r.student.student_id,
      class_id: r.class.id,
      class_name: r.class.name,
      status: r.status,
      marked_by: r.marked_by,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getActiveClasses = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = req.query.day || DAYS[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = req.query.time || `${hh}:${mm}`;

    const allClasses = await prisma.class.findMany({
      where: { institute_id, class_day: currentDay, is_active: true },
      select: { id: true, name: true, start_time: true, end_time: true, class_day: true, grade: true },
    });

    const classes = allClasses.filter((c) => {
      const startOk = !c.start_time || c.start_time <= currentTime;
      const endOk = !c.end_time || c.end_time >= currentTime;
      return startOk && endOk;
    });

    res.json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, data: [] });

    const students = await prisma.user.findMany({
      where: {
        role: 'student',
        is_active: true,
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { phone: { contains: q.trim() } },
          { student_id: { contains: q.trim() } },
        ],
      },
      select: { id: true, name: true, phone: true, student_id: true },
      take: 20,
    });

    res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.quickRegisterAndEnroll = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { name, phone, parent_phone, class_id } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required.' });
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required.' });

    const randomPass = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hashedPassword = await bcrypt.hash(randomPass, 10);
    const student_id = `STU${Date.now()}`;

    const user = await prisma.user.create({
      data: {
        role: 'student',
        name: name.trim(),
        phone: phone || null,
        parent_phone: parent_phone || null,
        password: hashedPassword,
        student_id,
        institute_id,
      },
    });

    const qrData = JSON.stringify({ userId: user.id, student_id, institute_id });
    await QRCode.toFile(`./uploads/qr_${user.id}.png`, qrData);
    await prisma.user.update({ where: { id: user.id }, data: { qr_code: `qr_${user.id}.png` } });

    const cls = await prisma.class.findFirst({
      where: { id: Number(class_id), institute_id, is_active: true },
      select: { id: true, name: true, monthly_fee: true },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    await prisma.classEnrollment.upsert({
      where: { class_id_student_id: { class_id: cls.id, student_id: user.id } },
      create: { class_id: cls.id, student_id: user.id, is_active: true },
      update: { is_active: true },
    });

    if (Number(cls.monthly_fee) > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const existingPayment = await prisma.payment.findFirst({ where: { student_id: user.id, class_id: cls.id, month } });
      if (!existingPayment) {
        await prisma.payment.create({
          data: { student_id: user.id, class_id: cls.id, institute_id, amount: cls.monthly_fee, month, status: 'pending' },
        });
      }
    }

    const today = new Date(new Date().toISOString().split('T')[0]);
    await prisma.attendance.upsert({
      where: { class_id_student_id_date: { class_id: cls.id, student_id: user.id, date: today } },
      create: { class_id: cls.id, student_id: user.id, date: today, status: 'present', marked_by: 'qr_scan' },
      update: { status: 'present' },
    });

    res.json({
      success: true, status: 'marked',
      studentName: name.trim(), studentId: user.id,
      className: cls.name, classId: cls.id,
      markedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.enrollAndMark = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { student_db_id, class_id } = req.body;

    const cls = await prisma.class.findFirst({
      where: { id: Number(class_id), institute_id, is_active: true },
      select: { id: true, name: true, monthly_fee: true },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const student = await prisma.user.findFirst({
      where: { id: Number(student_db_id), is_active: true },
      select: { id: true, name: true },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    await prisma.classEnrollment.upsert({
      where: { class_id_student_id: { class_id: cls.id, student_id: student.id } },
      create: { class_id: cls.id, student_id: student.id, is_active: true },
      update: { is_active: true },
    });

    if (Number(cls.monthly_fee) > 0) {
      const month = new Date().toISOString().slice(0, 7);
      const existingPayment = await prisma.payment.findFirst({ where: { student_id: student.id, class_id: cls.id, month } });
      if (!existingPayment) {
        await prisma.payment.create({
          data: { student_id: student.id, class_id: cls.id, institute_id, amount: cls.monthly_fee, month, status: 'pending' },
        });
      }
    }

    const today = new Date(new Date().toISOString().split('T')[0]);
    await prisma.attendance.upsert({
      where: { class_id_student_id_date: { class_id: cls.id, student_id: student.id, date: today } },
      create: { class_id: cls.id, student_id: student.id, date: today, status: 'present', marked_by: 'qr_scan' },
      update: { status: 'present' },
    });

    res.json({
      success: true, status: 'marked',
      studentName: student.name, studentId: student.id,
      className: cls.name, classId: cls.id,
      markedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.markManual = async (req, res) => {
  try {
    const { class_id, date, attendance_list } = req.body;
    const institute_id = req.user.institute_id;

    const cls = await prisma.class.findFirst({ where: { id: Number(class_id), institute_id } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const dateObj = new Date(date);
    for (const item of attendance_list) {
      await prisma.attendance.upsert({
        where: { class_id_student_id_date: { class_id: Number(class_id), student_id: Number(item.student_id), date: dateObj } },
        create: { class_id: Number(class_id), student_id: Number(item.student_id), date: dateObj, status: item.status, marked_by: 'manual' },
        update: { status: item.status, marked_by: 'manual' },
      });
    }

    res.json({ success: true, message: 'Attendance saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const { class_id } = req.params;
    const { date } = req.query;
    const checkDate = new Date(date || new Date().toISOString().split('T')[0]);

    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: Number(class_id), is_active: true },
      include: { student: { select: { id: true, name: true, student_id: true, photo: true } } },
      orderBy: { student: { name: 'asc' } },
    });

    const attendances = await prisma.attendance.findMany({
      where: { class_id: Number(class_id), date: checkDate },
      select: { student_id: true, status: true },
    });

    const attendanceMap = {};
    for (const a of attendances) attendanceMap[a.student_id] = a.status;

    const students = enrollments.map((e) => ({
      ...e.student,
      today_status: attendanceMap[e.student.id] || 'absent',
    }));

    res.json({ success: true, data: students, date: checkDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
