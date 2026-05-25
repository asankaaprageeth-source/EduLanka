const pool = require('../config/database');

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { subject, body, target_type, target_id } = req.body;
    const institute_id = req.user.institute_id;
    const sender_id = req.user.id;
    const sender_type = req.user.role === 'institute' ? 'institute' : 'teacher';

    const [result] = await pool.execute(
      'INSERT INTO messages (institute_id, sender_id, sender_type, subject, body, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [institute_id, sender_id || null, sender_type, subject, body, target_type, target_id || null]
    );
    const message_id = result.insertId;

    let recipients = [];

    if (target_type === 'all') {
      const [students] = await pool.execute(
        'SELECT id FROM users WHERE institute_id = ? AND role = "student" AND is_active = 1',
        [institute_id]
      );
      recipients = students.map((s) => ({ id: s.id, type: 'student' }));
    } else if (target_type === 'teachers') {
      const [teachers] = await pool.execute(
        'SELECT id FROM users WHERE institute_id = ? AND role = "teacher" AND is_active = 1',
        [institute_id]
      );
      recipients = teachers.map((t) => ({ id: t.id, type: 'teacher' }));
    } else if (target_type === 'class') {
      const [students] = await pool.execute(
        'SELECT ce.student_id as id FROM class_enrollments ce WHERE ce.class_id = ? AND ce.is_active = 1',
        [target_id]
      );
      recipients = students.map((s) => ({ id: s.id, type: 'student' }));
    } else if (target_type === 'individual') {
      const [user] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [target_id]);
      if (user.length > 0) recipients = [{ id: user[0].id, type: user[0].role }];
    }

    for (const r of recipients) {
      await pool.execute(
        'INSERT INTO message_recipients (message_id, recipient_id, recipient_type) VALUES (?, ?, ?)',
        [message_id, r.id, r.type]
      );
    }

    res.status(201).json({ success: true, message: 'Message sent.', data: { message_id, recipients_count: recipients.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get inbox for student or teacher
exports.getInbox = async (req, res) => {
  try {
    const user_id = req.user.id;
    const [messages] = await pool.execute(
      `SELECT m.id, m.subject, m.body, m.created_at, m.sender_type,
       mr.is_read, mr.read_at,
       CASE WHEN m.sender_type = 'institute' THEN i.name ELSE u.name END as sender_name
       FROM message_recipients mr
       JOIN messages m ON mr.message_id = m.id
       LEFT JOIN institutes i ON m.institute_id = i.id AND m.sender_type = 'institute'
       LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'teacher'
       WHERE mr.recipient_id = ?
       ORDER BY m.created_at DESC`,
      [user_id]
    );
    res.json({ success: true, data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get sent messages
exports.getSentMessages = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const sender_id = req.user.role === 'teacher' ? req.user.id : null;

    let query = `SELECT m.*, COUNT(mr.id) as recipient_count,
                 SUM(mr.is_read) as read_count
                 FROM messages m
                 LEFT JOIN message_recipients mr ON m.id = mr.message_id
                 WHERE m.institute_id = ?`;
    const params = [institute_id];

    if (sender_id) { query += ' AND m.sender_id = ?'; params.push(sender_id); }
    query += ' GROUP BY m.id ORDER BY m.created_at DESC';

    const [messages] = await pool.execute(query, params);
    res.json({ success: true, data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Mark message as read
exports.markRead = async (req, res) => {
  try {
    const { message_id } = req.params;
    const user_id = req.user.id;
    await pool.execute(
      'UPDATE message_recipients SET is_read = 1, read_at = NOW() WHERE message_id = ? AND recipient_id = ?',
      [message_id, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
