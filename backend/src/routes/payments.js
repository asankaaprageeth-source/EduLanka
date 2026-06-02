const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { recordPayment, generateMonthlyFees, getStudentPayments, updateOverdue } = require('../controllers/paymentController');

router.post('/record', auth, authorize('institute'), recordPayment);
router.post('/generate', auth, authorize('institute'), generateMonthlyFees);
router.get('/student', auth, authorize('student'), getStudentPayments);
router.get('/student/:student_id', auth, authorize('institute', 'teacher'), getStudentPayments);
router.post('/update-overdue', auth, authorize('institute'), updateOverdue);

// Get payments for a specific class (teacher/institute)
router.get('/class/:class_id', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const { month } = req.query;
    const institute_id = req.user.institute_id;

    if (req.user.role === 'teacher') {
      const cls = await prisma.class.findFirst({ where: { id: Number(class_id), teacher_id: req.user.id, is_active: true } });
      if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    const where = { class_id: Number(class_id), institute_id };
    if (month) where.month = month;

    const payments = await prisma.payment.findMany({
      where,
      include: { student: { select: { name: true, student_id: true } } },
      orderBy: [{ student: { name: 'asc' } }, { month: 'desc' }],
    });

    const data = payments.map((p) => ({
      ...p,
      student_name: p.student.name,
      student_no: p.student.student_id,
      student: undefined,
    }));

    const summary = data.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      acc[`${p.status}_amount`] = (acc[`${p.status}_amount`] || 0) + Number(p.amount);
      return acc;
    }, {});

    res.json({ success: true, data, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Generate monthly fee records for a teacher's class
router.post('/class/:class_id/generate', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const { month } = req.body;
    const institute_id = req.user.institute_id;

    if (!month) return res.status(400).json({ success: false, message: 'Month is required.' });

    const cls = await prisma.class.findFirst({
      where: { id: Number(class_id), institute_id },
      select: { id: true, monthly_fee: true },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (Number(cls.monthly_fee) <= 0) return res.status(400).json({ success: false, message: 'This class has no monthly fee set.' });

    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: Number(class_id), is_active: true },
      select: { student_id: true },
    });
    if (enrollments.length === 0) return res.status(400).json({ success: false, message: 'No enrolled students in this class.' });

    for (const e of enrollments) {
      const existing = await prisma.payment.findFirst({ where: { student_id: e.student_id, class_id: Number(class_id), month } });
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
});

// Mark a student payment as paid
router.post('/class/:class_id/record', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const { student_id, amount, month, notes } = req.body;
    const institute_id = req.user.institute_id;

    if (!student_id || !amount || !month) {
      return res.status(400).json({ success: false, message: 'student_id, amount and month are required.' });
    }

    const receipt_no = `REC${Date.now()}`;
    const paid_date = new Date(new Date().toISOString().split('T')[0]);

    const existing = await prisma.payment.findFirst({ where: { student_id: Number(student_id), class_id: Number(class_id), month } });
    if (existing) {
      await prisma.payment.update({
        where: { id: existing.id },
        data: { amount: Number(amount), paid_date, receipt_no, status: 'paid', notes: notes || null },
      });
    } else {
      await prisma.payment.create({
        data: { student_id: Number(student_id), class_id: Number(class_id), institute_id, amount: Number(amount), month, paid_date, receipt_no, status: 'paid', notes: notes || null },
      });
    }

    res.json({ success: true, message: 'Payment recorded.', data: { receipt_no, paid_date } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
