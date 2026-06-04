const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
require('dotenv').config();

const ADMIN_EMAIL    = 'asankaaprageeth@gmail.com';
const ADMIN_PASSWORD = '822631690v';

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email?.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const token = generateToken({ id: 0, role: 'admin', email: ADMIN_EMAIL });
    res.json({ success: true, message: 'Admin login successful.', data: { id: 0, name: 'Administrator', email: ADMIN_EMAIL, role: 'admin' }, token });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

exports.getAdminStats = async (req, res) => {
  try {
    const [totalInstitutes, totalStudents, totalTeachers, totalClasses] = await Promise.all([
      prisma.institute.count(),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'teacher' } }),
      prisma.class.count(),
    ]);
    res.json({ success: true, data: { totalInstitutes, totalStudents, totalTeachers, totalClasses } });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

exports.getAllInstitutes = async (req, res) => {
  try {
    const institutes = await prisma.institute.findMany({
      select: { id: true, name: true, email: true, phone: true, address: true, institute_code: true, is_active: true, created_at: true, _count: { select: { users: true, classes: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: institutes });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, institute_id } = req.query;
    const where = {};
    if (role && ['student', 'teacher'].includes(role)) where.role = role;
    if (institute_id) where.institute_id = parseInt(institute_id);
    const users = await prisma.user.findMany({
      where,
      select: { id: true, role: true, name: true, email: true, phone: true, student_id: true, district: true, is_active: true, created_at: true, institute: { select: { id: true, name: true, institute_code: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

exports.toggleInstituteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await prisma.institute.findUnique({ where: { id: parseInt(id) } });
    if (!inst) return res.status(404).json({ success: false, message: 'Institute not found.' });
    const updated = await prisma.institute.update({ where: { id: parseInt(id) }, data: { is_active: !inst.is_active } });
    res.json({ success: true, message: `Institute ${updated.is_active ? 'activated' : 'deactivated'}.`, data: updated });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const updated = await prisma.user.update({ where: { id: parseInt(id) }, data: { is_active: !user.is_active } });
    res.json({ success: true, message: `User ${updated.is_active ? 'activated' : 'deactivated'}.` });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// PATCH /api/admin/users/:id/reset-password
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 12);
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await prisma.user.update({ where: { id: parseInt(id) }, data: { password: hashed } });
    res.json({ success: true, message: 'User password reset successfully.' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// PATCH /api/admin/institutes/:id/reset-password
exports.resetInstitutePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 12);
    const inst = await prisma.institute.findUnique({ where: { id: parseInt(id) } });
    if (!inst) return res.status(404).json({ success: false, message: 'Institute not found.' });
    await prisma.institute.update({ where: { id: parseInt(id) }, data: { password: hashed } });
    res.json({ success: true, message: 'Institute password reset successfully.' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};
