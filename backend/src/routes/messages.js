const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { sendMessage, getInbox, getSentMessages, markRead } = require('../controllers/messageController');

router.get('/unread-count', auth, authorize('student', 'teacher'), async (req, res) => {
  try {
    const count = await prisma.messageRecipient.count({
      where: { recipient_id: req.user.id, is_read: false },
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

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

    const where = { institute_id, target_type: 'class', target_id: Number(class_id) };
    if (sender_id) where.sender_id = sender_id;

    const messages = await prisma.message.findMany({
      where,
      include: {
        _count: { select: { recipients: true } },
        recipients: { select: { is_read: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      created_at: m.created_at,
      target_type: m.target_type,
      recipient_count: m._count.recipients,
      read_count: m.recipients.filter((r) => r.is_read).length,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
