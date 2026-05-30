const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { sendMessage, getInbox, getSentMessages, markRead } = require('../controllers/messageController');

router.post('/send', auth, authorize('institute', 'teacher'), sendMessage);
router.get('/inbox', auth, authorize('student', 'teacher'), getInbox);
router.get('/sent', auth, authorize('institute', 'teacher'), getSentMessages);
router.put('/:message_id/read', auth, markRead);

// Get messages sent to a specific class (teacher/institute view)
router.get('/class/:class_id', auth, authorize('institute', 'teacher'), async (req, res) => {
  try {
    const { class_id } = req.params;
    const institute_id = req.user.institute_id;
    const sender_id = req.user.role === 'teacher' ? req.user.id : null;

    let query = `SELECT m.id, m.subject, m.body, m.created_at, m.target_type,
                        COUNT(mr.id)       AS recipient_count,
                        SUM(mr.is_read)    AS read_count
                 FROM messages m
                 LEFT JOIN message_recipients mr ON m.id = mr.message_id
                 WHERE m.institute_id = ? AND m.target_type = 'class' AND m.target_id = ?`;
    const params = [institute_id, class_id];

    if (sender_id) { query += ' AND m.sender_id = ?'; params.push(sender_id); }
    query += ' GROUP BY m.id ORDER BY m.created_at DESC';

    const [messages] = await pool.execute(query, params);
    res.json({ success: true, data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
