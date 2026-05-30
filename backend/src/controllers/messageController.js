const prisma = require('../config/prisma');

exports.sendMessage = async (req, res) => {
  try {
    const { subject, body, target_type, target_id } = req.body;
    const institute_id = req.user.institute_id;
    const sender_id = req.user.id;
    const sender_type = req.user.role === 'institute' ? 'institute' : 'teacher';

    const message = await prisma.message.create({
      data: {
        institute_id,
        sender_id: sender_id || null,
        sender_type,
        subject,
        body,
        target_type,
        target_id: target_id ? Number(target_id) : null,
      },
    });

    let recipientUsers = [];

    if (target_type === 'all') {
      recipientUsers = await prisma.user.findMany({
        where: { institute_id, role: 'student', is_active: true },
        select: { id: true, role: true },
      });
    } else if (target_type === 'teachers') {
      recipientUsers = await prisma.user.findMany({
        where: { institute_id, role: 'teacher', is_active: true },
        select: { id: true, role: true },
      });
    } else if (target_type === 'class') {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { class_id: Number(target_id), is_active: true },
        select: { student_id: true },
      });
      recipientUsers = enrollments.map((e) => ({ id: e.student_id, role: 'student' }));
    } else if (target_type === 'individual') {
      const user = await prisma.user.findUnique({
        where: { id: Number(target_id) },
        select: { id: true, role: true },
      });
      if (user) recipientUsers = [user];
    }

    if (recipientUsers.length > 0) {
      await prisma.messageRecipient.createMany({
        data: recipientUsers.map((r) => ({
          message_id: message.id,
          recipient_id: r.id,
          recipient_type: r.role,
        })),
      });
    }

    res.status(201).json({ success: true, message: 'Message sent.', data: { message_id: message.id, recipients_count: recipientUsers.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const user_id = req.user.id;

    const messageRecipients = await prisma.messageRecipient.findMany({
      where: { recipient_id: user_id },
      include: {
        message: { include: { institute: { select: { name: true } } } },
      },
      orderBy: { message: { created_at: 'desc' } },
    });

    const teacherSenderIds = [...new Set(
      messageRecipients
        .filter((mr) => mr.message.sender_type === 'teacher' && mr.message.sender_id)
        .map((mr) => mr.message.sender_id)
    )];

    const senders = teacherSenderIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: teacherSenderIds } }, select: { id: true, name: true } })
      : [];
    const senderMap = Object.fromEntries(senders.map((s) => [s.id, s.name]));

    const data = messageRecipients.map((mr) => ({
      id: mr.message.id,
      subject: mr.message.subject,
      body: mr.message.body,
      created_at: mr.message.created_at,
      sender_type: mr.message.sender_type,
      is_read: mr.is_read,
      read_at: mr.read_at,
      sender_name: mr.message.sender_type === 'institute'
        ? mr.message.institute.name
        : (senderMap[mr.message.sender_id] || null),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getSentMessages = async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const sender_id = req.user.role === 'teacher' ? req.user.id : null;

    const where = { institute_id };
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
      ...m,
      recipient_count: m._count.recipients,
      read_count: m.recipients.filter((r) => r.is_read).length,
      _count: undefined,
      recipients: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { message_id } = req.params;
    const user_id = req.user.id;

    await prisma.messageRecipient.updateMany({
      where: { message_id: Number(message_id), recipient_id: user_id },
      data: { is_read: true, read_at: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
