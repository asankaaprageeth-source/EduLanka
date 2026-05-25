const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { recordPayment, generateMonthlyFees, getStudentPayments, updateOverdue } = require('../controllers/paymentController');

router.post('/record', auth, authorize('institute'), recordPayment);
router.post('/generate', auth, authorize('institute'), generateMonthlyFees);
router.get('/student', auth, authorize('student'), getStudentPayments);
router.get('/student/:student_id', auth, authorize('institute', 'teacher'), getStudentPayments);
router.post('/update-overdue', auth, authorize('institute'), updateOverdue);

module.exports = router;
