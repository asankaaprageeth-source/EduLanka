const prisma = require('../config/prisma');

exports.recordPayment = async (req, res) => {
  try {
    const { student_id, class_id, amount, month, notes } = req.body;
    const institute_id = req.user.institute_id;

    const receipt_no = `REC${Date.now()}`;
    const paid_date = new Date(new Date().toISOString().split('T')[0]);

    const existingPayment = await prisma.payment.findFirst({
      where: { student_id: Number(student_id), class_id: Number(class_id), month },
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { amount: Number(amount), paid_date, receipt_no, status: 'paid', notes: notes || null },
      });
    } else {
      await prisma.payment.create({
        data: {
          student_id: Number(student_id),
          class_id: Number(class_id),
          institute_id,
          amount: Number(amount),
          month,
          paid_date,
          receipt_no,
          status: 'paid',
          notes: notes || null,
        },
      });
    }

    res.json({ success: true, message: 'Payment recorded.', data: { receipt_no, paid_date } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.generateMonthlyFees = async (req, res) => {
  try {
    const { class_id, month } = req.body;
    const institute_id = req.user.institute_id;

    const cls = await prisma.class.findFirst({
      where: { id: Number(class_id), institute_id },
      select: { id: true, monthly_fee: true },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: Number(class_id), is_active: true },
      select: { student_id: true },
    });

    for (const e of enrollments) {
      const existing = await prisma.payment.findFirst({
        where: { student_id: e.student_id, class_id: Number(class_id), month },
      });
      if (!existing) {
        await prisma.payment.create({
          data: { student_id: e.student_id, class_id: Number(class_id), institute_id, amount: cls.monthly_fee, month, status: 'pending' },
        });
      }
    }

    res.json({ success: true, message: `Fee records generated for ${enrollments.length} students.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getStudentPayments = async (req, res) => {
  try {
    const student_id = req.user.role === 'student' ? req.user.id : Number(req.params.student_id);
    const institute_id = req.user.institute_id;

    const payments = await prisma.payment.findMany({
      where: { student_id, institute_id },
      include: { class: { select: { name: true } } },
      orderBy: { month: 'desc' },
    });

    const data = payments.map((p) => ({
      ...p,
      class_name: p.class.name,
      class: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateOverdue = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    await prisma.payment.updateMany({
      where: { status: 'pending', month: { lt: currentMonth } },
      data: { status: 'overdue' },
    });

    res.json({ success: true, message: 'Overdue statuses updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
