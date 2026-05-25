const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { sendMessage, getInbox, getSentMessages, markRead } = require('../controllers/messageController');

router.post('/send', auth, authorize('institute', 'teacher'), sendMessage);
router.get('/inbox', auth, authorize('student', 'teacher'), getInbox);
router.get('/sent', auth, authorize('institute', 'teacher'), getSentMessages);
router.put('/:message_id/read', auth, markRead);

module.exports = router;
