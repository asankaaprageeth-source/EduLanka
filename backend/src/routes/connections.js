const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../config/prisma');

router.get('/search/institutes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const { q } = req.query;

    const where = { is_active: true };
    if (q?.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { institute_code: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const institutes = await prisma.institute.findMany({
      where,
      select: {
        id: true, name: true, address: true, institute_code: true, logo: true,
        _count: { select: { users: { where: { role: 'teacher', is_active: true } }, classes: { where: { is_active: true } } } },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    const connections = await prisma.teacherInstituteConnection.findMany({
      where: { teacher_id },
      select: { id: true, institute_id: true, status: true, requested_by: true },
    });
    const connMap = Object.fromEntries(connections.map((c) => [c.institute_id, c]));

    const data = institutes.map((i) => ({
      id: i.id, name: i.name, address: i.address, institute_code: i.institute_code, logo: i.logo,
      connection_status: connMap[i.id]?.status || 'none',
      requested_by: connMap[i.id]?.requested_by || null,
      connection_id: connMap[i.id]?.id || null,
      teacher_count: i._count.users,
      class_count: i._count.classes,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/search/teachers', auth, authorize('institute'), async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { q, district, subject } = req.query;

    const where = { role: 'teacher', is_active: true };
    const orConditions = [];
    if (q?.trim()) {
      orConditions.push({ name: { contains: q.trim(), mode: 'insensitive' } });
      orConditions.push({ subjects: { contains: q.trim() } });
    }
    if (subject?.trim()) where.subjects = { contains: subject.trim() };
    if (orConditions.length > 0) where.OR = orConditions;
    if (district?.trim()) where.district = district.trim();

    const teachers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, district: true, city: true, subjects: true, photo: true },
      take: 20,
      orderBy: { name: 'asc' },
    });

    const teacherIds = teachers.map((t) => t.id);
    const [connections, instituteCounts, classCounts] = await Promise.all([
      prisma.teacherInstituteConnection.findMany({
        where: { institute_id },
        select: { id: true, teacher_id: true, status: true, requested_by: true },
      }),
      prisma.teacherInstituteConnection.groupBy({
        by: ['teacher_id'],
        where: { teacher_id: { in: teacherIds }, status: 'accepted' },
        _count: { _all: true },
      }),
      prisma.class.groupBy({
        by: ['teacher_id'],
        where: { teacher_id: { in: teacherIds }, is_active: true },
        _count: { _all: true },
      }),
    ]);

    const connMap = Object.fromEntries(connections.map((c) => [c.teacher_id, c]));
    const instCountMap = Object.fromEntries(instituteCounts.map((c) => [c.teacher_id, c._count._all]));
    const classCountMap = Object.fromEntries(classCounts.map((c) => [c.teacher_id, c._count._all]));

    const data = teachers.map((t) => ({
      ...t,
      connection_status: connMap[t.id]?.status || 'none',
      requested_by: connMap[t.id]?.requested_by || null,
      connection_id: connMap[t.id]?.id || null,
      institute_count: instCountMap[t.id] || 0,
      class_count: classCountMap[t.id] || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/request', auth, authorize('teacher', 'institute'), async (req, res) => {
  try {
    const { targetId, targetType } = req.body;
    let teacher_id, institute_id, requested_by;

    if (req.user.role === 'teacher') {
      if (targetType !== 'institute') return res.status(400).json({ success: false, message: 'Invalid target.' });
      teacher_id = req.user.id;
      institute_id = Number(targetId);
      requested_by = 'teacher';
    } else {
      if (targetType !== 'teacher') return res.status(400).json({ success: false, message: 'Invalid target.' });
      teacher_id = Number(targetId);
      institute_id = req.user.institute_id;
      requested_by = 'institute';
    }

    await prisma.teacherInstituteConnection.upsert({
      where: { teacher_id_institute_id: { teacher_id, institute_id } },
      create: { teacher_id, institute_id, status: 'pending', requested_by },
      update: { status: 'pending', requested_by },
    });

    res.json({ success: true, message: 'Connection request sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/:id/accept', auth, authorize('teacher', 'institute'), async (req, res) => {
  try {
    const { id } = req.params;
    const whereFilter = req.user.role === 'teacher'
      ? { id: Number(id), teacher_id: req.user.id, requested_by: 'institute', status: 'pending' }
      : { id: Number(id), institute_id: req.user.institute_id, requested_by: 'teacher', status: 'pending' };

    const conn = await prisma.teacherInstituteConnection.findFirst({ where: whereFilter });
    if (!conn) return res.status(404).json({ success: false, message: 'Request not found.' });

    await prisma.teacherInstituteConnection.update({ where: { id: conn.id }, data: { status: 'accepted' } });
    res.json({ success: true, message: 'Connection accepted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/:id/reject', auth, authorize('teacher', 'institute'), async (req, res) => {
  try {
    const { id } = req.params;
    const whereFilter = req.user.role === 'teacher'
      ? { id: Number(id), teacher_id: req.user.id, requested_by: 'institute', status: 'pending' }
      : { id: Number(id), institute_id: req.user.institute_id, requested_by: 'teacher', status: 'pending' };

    const conn = await prisma.teacherInstituteConnection.findFirst({ where: whereFilter });
    if (!conn) return res.status(404).json({ success: false, message: 'Request not found.' });

    await prisma.teacherInstituteConnection.update({ where: { id: conn.id }, data: { status: 'rejected' } });
    res.json({ success: true, message: 'Connection rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.delete('/:id', auth, authorize('teacher', 'institute'), async (req, res) => {
  try {
    const { id } = req.params;
    const whereFilter = req.user.role === 'teacher'
      ? { id: Number(id), teacher_id: req.user.id }
      : { id: Number(id), institute_id: req.user.institute_id };

    const conn = await prisma.teacherInstituteConnection.findFirst({ where: whereFilter });
    if (!conn) return res.status(404).json({ success: false, message: 'Connection not found.' });

    await prisma.teacherInstituteConnection.update({ where: { id: conn.id }, data: { status: 'disconnected' } });
    res.json({ success: true, message: 'Disconnected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/my-institutes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher_id = req.user.id;

    const connections = await prisma.teacherInstituteConnection.findMany({
      where: { teacher_id, status: 'accepted' },
      orderBy: { updated_at: 'desc' },
    });

    const instituteIds = connections.map((c) => c.institute_id);
    const [institutes, myClassCounts, totalClassCounts] = await Promise.all([
      prisma.institute.findMany({ where: { id: { in: instituteIds } } }),
      prisma.class.groupBy({
        by: ['institute_id'],
        where: { teacher_id, institute_id: { in: instituteIds }, is_active: true },
        _count: { _all: true },
      }),
      prisma.class.groupBy({
        by: ['institute_id'],
        where: { institute_id: { in: instituteIds }, is_active: true },
        _count: { _all: true },
      }),
    ]);

    const instMap = Object.fromEntries(institutes.map((i) => [i.id, i]));
    const myClassMap = Object.fromEntries(myClassCounts.map((c) => [c.institute_id, c._count._all]));
    const totalClassMap = Object.fromEntries(totalClassCounts.map((c) => [c.institute_id, c._count._all]));

    const data = connections.map((conn) => ({
      connection_id: conn.id,
      id: conn.institute_id,
      name: instMap[conn.institute_id]?.name,
      address: instMap[conn.institute_id]?.address,
      institute_code: instMap[conn.institute_id]?.institute_code,
      my_class_count: myClassMap[conn.institute_id] || 0,
      total_classes: totalClassMap[conn.institute_id] || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/my-teachers', auth, authorize('institute'), async (req, res) => {
  try {
    const institute_id = req.user.institute_id;

    const connections = await prisma.teacherInstituteConnection.findMany({
      where: { institute_id, status: 'accepted' },
      orderBy: { updated_at: 'desc' },
    });

    const teacherIds = connections.map((c) => c.teacher_id);
    const [teachers, classCounts] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, name: true, email: true, phone: true, district: true, city: true, subjects: true, photo: true },
      }),
      prisma.class.groupBy({
        by: ['teacher_id'],
        where: { teacher_id: { in: teacherIds }, institute_id, is_active: true },
        _count: { _all: true },
      }),
    ]);

    const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));
    const classMap = Object.fromEntries(classCounts.map((c) => [c.teacher_id, c._count._all]));

    const data = connections.map((conn) => ({
      connection_id: conn.id,
      ...teacherMap[conn.teacher_id],
      class_count: classMap[conn.teacher_id] || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/pending', auth, authorize('teacher', 'institute'), async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const connections = await prisma.teacherInstituteConnection.findMany({
        where: { teacher_id: req.user.id, status: 'pending', requested_by: 'institute' },
        orderBy: { created_at: 'desc' },
      });
      const instituteIds = connections.map((c) => c.institute_id);
      const institutes = await prisma.institute.findMany({
        where: { id: { in: instituteIds } },
        select: { id: true, name: true, address: true, institute_code: true },
      });
      const instMap = Object.fromEntries(institutes.map((i) => [i.id, i]));
      const data = connections.map((c) => ({ connection_id: c.id, created_at: c.created_at, ...instMap[c.institute_id] }));
      return res.json({ success: true, data });
    } else {
      const connections = await prisma.teacherInstituteConnection.findMany({
        where: { institute_id: req.user.institute_id, status: 'pending', requested_by: 'teacher' },
        orderBy: { created_at: 'desc' },
      });
      const teacherIds = connections.map((c) => c.teacher_id);
      const teachers = await prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, name: true, email: true, district: true, subjects: true },
      });
      const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));
      const data = connections.map((c) => ({ connection_id: c.id, created_at: c.created_at, ...teacherMap[c.teacher_id] }));
      return res.json({ success: true, data });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/pending-count', auth, authorize('teacher', 'institute'), async (req, res) => {
  try {
    const count = req.user.role === 'teacher'
      ? await prisma.teacherInstituteConnection.count({ where: { teacher_id: req.user.id, status: 'pending', requested_by: 'institute' } })
      : await prisma.teacherInstituteConnection.count({ where: { institute_id: req.user.institute_id, status: 'pending', requested_by: 'teacher' } });

    res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
