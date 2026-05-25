const pool = require('../config/database');

// Create exam
exports.createExam = async (req, res) => {
  try {
    const { class_id, title, description, duration_minutes, questions, start_time, end_time } = req.body;
    const institute_id = req.user.institute_id;
    const teacher_id = req.user.role === 'teacher' ? req.user.id : null;

    const [result] = await pool.execute(
      'INSERT INTO exams (class_id, teacher_id, institute_id, title, description, duration_minutes, total_marks, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [class_id, teacher_id, institute_id, title, description || null, duration_minutes || 60,
       questions ? questions.length : 0, start_time || null, end_time || null]
    );
    const exam_id = result.insertId;

    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await pool.execute(
          'INSERT INTO exam_questions (exam_id, question, option_a, option_b, option_c, option_d, correct_answer, marks, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [exam_id, q.question, q.option_a, q.option_b, q.option_c || null, q.option_d || null, q.correct_answer, q.marks || 1, i + 1]
        );
      }
    }

    res.status(201).json({ success: true, message: 'Exam created.', data: { exam_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Publish exam
exports.publishExam = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const institute_id = req.user.institute_id;
    await pool.execute(
      'UPDATE exams SET is_published = 1 WHERE id = ? AND institute_id = ?',
      [exam_id, institute_id]
    );
    res.json({ success: true, message: 'Exam published.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get exams for student
exports.getStudentExams = async (req, res) => {
  try {
    const student_id = req.user.id;
    const [exams] = await pool.execute(
      `SELECT e.id, e.title, e.description, e.duration_minutes, e.total_marks,
       e.start_time, e.end_time, e.is_published, c.name as class_name,
       er.score, er.percentage, er.rank_position, er.submitted_at
       FROM exams e
       JOIN classes c ON e.class_id = c.id
       JOIN class_enrollments ce ON ce.class_id = c.id AND ce.student_id = ?
       LEFT JOIN exam_results er ON er.exam_id = e.id AND er.student_id = ?
       WHERE e.is_published = 1
       ORDER BY e.created_at DESC`,
      [student_id, student_id]
    );
    res.json({ success: true, data: exams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get exam questions (for taking exam)
exports.getExamQuestions = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const student_id = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ?',
      [exam_id, student_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Exam already submitted.' });
    }

    const [questions] = await pool.execute(
      'SELECT id, question, option_a, option_b, option_c, option_d, marks, order_num FROM exam_questions WHERE exam_id = ? ORDER BY order_num',
      [exam_id]
    );
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Submit exam
exports.submitExam = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { answers } = req.body;
    const student_id = req.user.id;

    const [questions] = await pool.execute(
      'SELECT id, correct_answer, marks FROM exam_questions WHERE exam_id = ?',
      [exam_id]
    );

    let score = 0;
    const total_marks = questions.reduce((sum, q) => sum + q.marks, 0);

    for (const q of questions) {
      if (answers[q.id] && answers[q.id].toLowerCase() === q.correct_answer) {
        score += q.marks;
      }
    }

    const percentage = total_marks > 0 ? ((score / total_marks) * 100).toFixed(2) : 0;

    await pool.execute(
      'INSERT INTO exam_results (exam_id, student_id, score, total_marks, percentage, answers) VALUES (?, ?, ?, ?, ?, ?)',
      [exam_id, student_id, score, total_marks, percentage, JSON.stringify(answers)]
    );

    // Update ranks
    const [allResults] = await pool.execute(
      'SELECT id, student_id, score FROM exam_results WHERE exam_id = ? ORDER BY score DESC',
      [exam_id]
    );
    for (let i = 0; i < allResults.length; i++) {
      await pool.execute('UPDATE exam_results SET rank_position = ? WHERE id = ?', [i + 1, allResults[i].id]);
    }

    res.json({ success: true, message: 'Exam submitted.', data: { score, total_marks, percentage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get exam results (teacher/institute)
exports.getExamResults = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const [results] = await pool.execute(
      `SELECT er.*, u.name as student_name, u.student_id
       FROM exam_results er
       JOIN users u ON er.student_id = u.id
       WHERE er.exam_id = ?
       ORDER BY er.rank_position`,
      [exam_id]
    );
    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
