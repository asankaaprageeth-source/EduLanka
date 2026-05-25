const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { createExam, publishExam, getStudentExams, getExamQuestions, submitExam, getExamResults } = require('../controllers/examController');

router.post('/', auth, authorize('institute', 'teacher'), createExam);
router.put('/:exam_id/publish', auth, authorize('institute', 'teacher'), publishExam);
router.get('/student', auth, authorize('student'), getStudentExams);
router.get('/:exam_id/questions', auth, authorize('student'), getExamQuestions);
router.post('/:exam_id/submit', auth, authorize('student'), submitExam);
router.get('/:exam_id/results', auth, authorize('institute', 'teacher'), getExamResults);

module.exports = router;
