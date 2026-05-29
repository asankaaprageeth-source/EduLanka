const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getDashboard, getStudents, getTeachers, getClasses,
  createClass, updateClass, deleteClass, enrollStudent,
  getAttendanceReport, getIncomeReport, getInstitutesList
} = require('../controllers/instituteController');

router.use(auth, authorize('institute'));

router.get('/dashboard', getDashboard);
router.get('/students', getStudents);
router.get('/teachers', getTeachers);
router.get('/institutes', getInstitutesList);
router.get('/classes', getClasses);
router.post('/classes', createClass);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);
router.post('/enroll', enrollStudent);
router.get('/reports/attendance', getAttendanceReport);
router.get('/reports/income', getIncomeReport);

module.exports = router;
