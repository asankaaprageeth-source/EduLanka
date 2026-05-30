const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { createExam, publishExam, getStudentExams, getExamQuestions, submitExam, getExamResults } = require('../controllers/examController');

router.post('/', auth, authorize('institute', 'teacher'), createExam);
router.put('/:exam_id/publish', auth, authorize('institute', 'teacher'), publishExam);
router.get('/student', auth, authorize('student'), getStudentExams);

// Get all exams for a specific class (teacher/institute)
router.get('/class/:class_id', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const institute_id = req.user.institute_id;
    const [exams] = await pool.execute(
      `SELECT e.id, e.title, e.description, e.duration_minutes, e.total_marks,
              e.is_published, e.start_time, e.end_time, e.created_at,
              COUNT(DISTINCT eq.id)                                         AS question_count,
              COUNT(DISTINCT er.id)                                         AS result_count,
              ROUND(AVG(er.percentage), 1)                                  AS avg_percentage,
              COUNT(CASE WHEN er.percentage >= 50 THEN 1 END)               AS pass_count
       FROM exams e
       LEFT JOIN exam_questions eq ON eq.exam_id = e.id
       LEFT JOIN exam_results   er ON er.exam_id = e.id
       WHERE e.class_id = ? AND e.institute_id = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [class_id, institute_id]
    );
    res.json({ success: true, data: exams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Delete exam
router.delete('/:exam_id', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { exam_id } = req.params;
    const institute_id = req.user.institute_id;
    const [[exam]] = await pool.execute(
      'SELECT id FROM exams WHERE id = ? AND institute_id = ?',
      [exam_id, institute_id]
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    await pool.execute('DELETE FROM exams WHERE id = ?', [exam_id]);
    res.json({ success: true, message: 'Exam deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/:exam_id/questions', auth, authorize('student'), getExamQuestions);
router.post('/:exam_id/submit', auth, authorize('student'), submitExam);
router.get('/:exam_id/results', auth, authorize('institute', 'teacher'), getExamResults);

module.exports = router;
