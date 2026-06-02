const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { createExam, publishExam, getStudentExams, getExamQuestions, submitExam, getExamResults } = require('../controllers/examController');

router.post('/', auth, authorize('institute', 'teacher'), createExam);
router.put('/:exam_id/publish', auth, authorize('institute', 'teacher'), publishExam);
router.get('/student', auth, authorize('student'), getStudentExams);

// Get all exams for a specific class (teacher/institute)
router.get('/class/:class_id', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const institute_id = req.user.institute_id;

    const exams = await prisma.exam.findMany({
      where: { class_id: Number(class_id), institute_id },
      include: {
        _count: { select: { questions: true, results: true } },
        results: { select: { percentage: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = exams.map((e) => {
      const percentages = e.results.map((r) => Number(r.percentage));
      const avg_percentage = percentages.length
        ? parseFloat((percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1))
        : null;
      return {
        id: e.id, title: e.title, description: e.description,
        duration_minutes: e.duration_minutes, total_marks: e.total_marks,
        is_published: e.is_published, start_time: e.start_time,
        end_time: e.end_time, created_at: e.created_at,
        question_count: e._count.questions,
        result_count: e._count.results,
        avg_percentage,
        pass_count: percentages.filter((p) => p >= 50).length,
      };
    });

    res.json({ success: true, data });
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

    const exam = await prisma.exam.findFirst({ where: { id: Number(exam_id), institute_id } });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    await prisma.exam.delete({ where: { id: Number(exam_id) } });
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
