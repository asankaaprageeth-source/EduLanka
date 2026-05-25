const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getDashboard, getStudents, getTeachers, getClasses,
  createClass, enrollStudent, getAttendanceReport, getIncomeReport
} = require('../controllers/instituteController');

router.use(auth, authorize('institute'));

router.get('/dashboard', getDashboard);
router.get('/students', getStudents);
router.get('/teachers', getTeachers);
router.get('/classes', getClasses);
router.post('/classes', createClass);
router.post('/enroll', enrollStudent);
router.get('/reports/attendance', getAttendanceReport);
router.get('/reports/income', getIncomeReport);

module.exports = router;
