const prisma = require('../config/prisma');

exports.createExam = async (req, res) => {
  try {
    const { class_id, title, description, duration_minutes, questions, start_time, end_time } = req.body;
    const institute_id = req.user.institute_id;
    const teacher_id = req.user.role === 'teacher' ? req.user.id : null;

    const exam = await prisma.exam.create({
      data: {
        class_id: Number(class_id),
        teacher_id,
        institute_id,
        title,
        description: description || null,
        duration_minutes: duration_minutes || 60,
        total_marks: questions ? questions.length : 0,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
      },
    });

    if (questions && questions.length > 0) {
      await prisma.examQuestion.createMany({
        data: questions.map((q, i) => ({
          exam_id: exam.id,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c || null,
          option_d: q.option_d || null,
          correct_answer: q.correct_answer,
          marks: q.marks || 1,
          order_num: i + 1,
        })),
      });
    }

    res.status(201).json({ success: true, message: 'Exam created.', data: { exam_id: exam.id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.publishExam = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const institute_id = req.user.institute_id;

    await prisma.exam.updateMany({
      where: { id: Number(exam_id), institute_id },
      data: { is_published: true },
    });

    res.json({ success: true, message: 'Exam published.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getStudentExams = async (req, res) => {
  try {
    const student_id = req.user.id;

    const exams = await prisma.exam.findMany({
      where: {
        is_published: true,
        class: { enrollments: { some: { student_id, is_active: true } } },
      },
      include: {
        class: { select: { name: true } },
        results: {
          where: { student_id },
          select: { score: true, percentage: true, rank_position: true, submitted_at: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      duration_minutes: e.duration_minutes,
      total_marks: e.total_marks,
      start_time: e.start_time,
      end_time: e.end_time,
      is_published: e.is_published,
      class_name: e.class.name,
      score: e.results[0]?.score ?? null,
      percentage: e.results[0]?.percentage ?? null,
      rank_position: e.results[0]?.rank_position ?? null,
      submitted_at: e.results[0]?.submitted_at ?? null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getExamQuestions = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const student_id = req.user.id;

    const existing = await prisma.examResult.findUnique({
      where: { exam_id_student_id: { exam_id: Number(exam_id), student_id } },
    });
    if (existing) return res.status(400).json({ success: false, message: 'Exam already submitted.' });

    const questions = await prisma.examQuestion.findMany({
      where: { exam_id: Number(exam_id) },
      select: { id: true, question: true, option_a: true, option_b: true, option_c: true, option_d: true, marks: true, order_num: true },
      orderBy: { order_num: 'asc' },
    });

    res.json({ success: true, data: questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { answers } = req.body;
    const student_id = req.user.id;

    const questions = await prisma.examQuestion.findMany({
      where: { exam_id: Number(exam_id) },
      select: { id: true, correct_answer: true, marks: true },
    });

    let score = 0;
    const total_marks = questions.reduce((sum, q) => sum + q.marks, 0);
    for (const q of questions) {
      if (answers[q.id] && answers[q.id].toLowerCase() === q.correct_answer) {
        score += q.marks;
      }
    }
    const percentage = total_marks > 0 ? parseFloat(((score / total_marks) * 100).toFixed(2)) : 0;

    await prisma.examResult.create({
      data: { exam_id: Number(exam_id), student_id, score, total_marks, percentage, answers },
    });

    const allResults = await prisma.examResult.findMany({
      where: { exam_id: Number(exam_id) },
      orderBy: { score: 'desc' },
      select: { id: true },
    });

    for (let i = 0; i < allResults.length; i++) {
      await prisma.examResult.update({ where: { id: allResults[i].id }, data: { rank_position: i + 1 } });
    }

    res.json({ success: true, message: 'Exam submitted.', data: { score, total_marks, percentage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getExamResults = async (req, res) => {
  try {
    const { exam_id } = req.params;

    const results = await prisma.examResult.findMany({
      where: { exam_id: Number(exam_id) },
      include: { student: { select: { name: true, student_id: true } } },
      orderBy: { rank_position: 'asc' },
    });

    const data = results.map((r) => ({
      ...r,
      student_name: r.student.name,
      student_id: r.student.student_id,
      student: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
