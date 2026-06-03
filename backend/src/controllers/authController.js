const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const fs = require('fs');
const prisma = require('../config/prisma');
require('dotenv').config();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
};

const sendResetEmail = async (toEmail, resetLink) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] Password reset link for ${toEmail}: ${resetLink}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `EduLanka <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'EduLanka - Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <h2 style="color:#1976d2;">EduLanka Password Reset</h2>
        <p>ඔබගේ EduLanka account password reset කිරීමට request කර ඇත.</p>
        <p>පහත button click කර new password set කරන්න:</p>
        <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
        <p style="color:#666;font-size:13px;">මෙම link <strong>1 hour</strong> පමණක් valid වේ.</p>
        <p style="color:#666;font-size:13px;">ඔබ password reset request නොකළේ නම් මෙම email ignore කරන්න.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
        <p style="color:#999;font-size:12px;">EduLanka School Management System</p>
      </div>
    `,
  });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const userEmail = email.trim().toLowerCase();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    let table = null;
    let userId = null;

    const instRow = await prisma.institute.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' }, is_active: true },
      select: { id: true },
    });
    if (instRow) {
      table = 'institute';
      userId = instRow.id;
    } else {
      const userRow = await prisma.user.findFirst({
        where: { email: { equals: userEmail, mode: 'insensitive' }, is_active: true },
        select: { id: true },
      });
      if (userRow) {
        table = 'user';
        userId = userRow.id;
      }
    }

    if (!table) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const cnt = table === 'institute'
      ? await prisma.institute.count({ where: { id: userId, reset_token: { not: null }, reset_token_expiry: { gt: hourAgo } } })
      : await prisma.user.count({ where: { id: userId, reset_token: { not: null }, reset_token_expiry: { gt: hourAgo } } });

    if (cnt >= 3) {
      return res.status(429).json({ success: false, message: 'Too many reset requests. Please try again in an hour.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    if (table === 'institute') {
      await prisma.institute.update({ where: { id: userId }, data: { reset_token: token, reset_token_expiry: expiry } });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { reset_token: token, reset_token_expiry: expiry } });
    }

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    await sendResetEmail(email.trim(), resetLink);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const now = new Date();

    const instRow = await prisma.institute.findFirst({
      where: { reset_token: token, reset_token_expiry: { gt: now } },
      select: { id: true },
    });
    if (instRow) return res.json({ success: true, valid: true });

    const userRow = await prisma.user.findFirst({
      where: { reset_token: token, reset_token_expiry: { gt: now } },
      select: { id: true },
    });
    if (userRow) return res.json({ success: true, valid: true });

    res.json({ success: false, valid: false, message: 'Invalid or expired reset link.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const now = new Date();
    const hashed = await bcrypt.hash(newPassword, 12);

    const instRow = await prisma.institute.findFirst({
      where: { reset_token: token, reset_token_expiry: { gt: now } },
      select: { id: true },
    });
    if (instRow) {
      await prisma.institute.update({
        where: { id: instRow.id },
        data: { password: hashed, reset_token: null, reset_token_expiry: null },
      });
      return res.json({ success: true, message: 'Password reset successfully.' });
    }

    const userRow = await prisma.user.findFirst({
      where: { reset_token: token, reset_token_expiry: { gt: now } },
      select: { id: true },
    });
    if (userRow) {
      await prisma.user.update({
        where: { id: userRow.id },
        data: { password: hashed, reset_token: null, reset_token_expiry: null },
      });
      return res.json({ success: true, message: 'Password reset successfully.' });
    }

    res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const generateInstituteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'EDU';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

exports.registerInstitute = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const existing = await prisma.institute.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    let institute_code = generateInstituteCode();
    while (await prisma.institute.findUnique({ where: { institute_code } })) {
      institute_code = generateInstituteCode();
    }

    const institute = await prisma.institute.create({
      data: { name, email, password: hashedPassword, phone: phone || null, address: address || null, institute_code },
    });

    const token = generateToken({ id: institute.id, role: 'institute', institute_id: institute.id });

    res.status(201).json({
      success: true,
      message: 'Institute registered successfully.',
      data: { id: institute.id, name, email, institute_code, role: 'institute' },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, parent_phone, role, institute_code, district, city, village, subjects } = req.body;

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (role === 'teacher' && !district) {
      return res.status(400).json({ success: false, message: 'District is required.' });
    }
    if (role === 'teacher' && (!subjects || !Array.isArray(subjects) || subjects.length === 0)) {
      return res.status(400).json({ success: false, message: 'Please select at least one subject.' });
    }

    let institute_id = null;
    if (role === 'teacher') {
      if (!institute_code) {
        return res.status(400).json({ success: false, message: 'Institute code is required for teachers.' });
      }
      const institute = await prisma.institute.findFirst({
        where: { institute_code, is_active: true },
        select: { id: true },
      });
      if (!institute) {
        return res.status(400).json({ success: false, message: 'Invalid institute code.' });
      }
      institute_id = institute.id;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const student_id = role === 'student' ? `STU${Date.now()}` : null;
    const subjectsJson = role === 'teacher' && subjects && subjects.length ? JSON.stringify(subjects) : null;

    const user = await prisma.user.create({
      data: {
        institute_id,
        role,
        name,
        email: email || null,
        password: hashedPassword,
        phone: phone || null,
        parent_phone: parent_phone || null,
        student_id,
        district: district || null,
        city: city || null,
        village: village || null,
        subjects: subjectsJson,
      },
    });

    if (role === 'student') {
      fs.mkdirSync('./uploads', { recursive: true });
      const qrData = JSON.stringify({ userId: user.id, student_id, institute_id });
      await QRCode.toFile(`./uploads/qr_${user.id}.png`, qrData);
      await prisma.user.update({ where: { id: user.id }, data: { qr_code: `qr_${user.id}.png` } });
    }

    const token = generateToken({ id: user.id, role, institute_id });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully.`,
      data: { id: user.id, name, email, role, institute_id, student_id },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    let user = null;
    let tokenPayload = null;

    if (role === 'institute') {
      user = await prisma.institute.findFirst({ where: { email, is_active: true } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      tokenPayload = { id: user.id, role: 'institute', institute_id: user.id };
    } else {
      user = await prisma.user.findFirst({ where: { email, role, is_active: true } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      tokenPayload = { id: user.id, role: user.role, institute_id: user.institute_id };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = generateToken(tokenPayload);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        institute_id: tokenPayload.institute_id,
        institute_code: user.institute_code || null,
        photo: user.photo || null,
        qr_code: user.qr_code || null,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    let data;

    if (role === 'institute') {
      data = await prisma.institute.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, phone: true, address: true, logo: true, institute_code: true, created_at: true },
      });
    } else {
      data = await prisma.user.findUnique({
        where: { id },
        select: { id: true, institute_id: true, role: true, name: true, email: true, phone: true, parent_phone: true, photo: true, qr_code: true, student_id: true, district: true, city: true, village: true, subjects: true, created_at: true },
      });
    }

    res.json({ success: true, data: { ...data, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { name, email, phone, parent_phone, district, city, village, subjects } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    const data = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      district: district?.trim() || null,
      city: city?.trim() || null,
      village: village?.trim() || null,
    };

    if (role === 'student') {
      data.parent_phone = parent_phone?.trim() || null;
    }
    if (role === 'teacher' && Array.isArray(subjects)) {
      data.subjects = subjects.length ? JSON.stringify(subjects) : null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, institute_id: true, role: true, name: true, email: true, phone: true, parent_phone: true, photo: true, student_id: true, district: true, city: true, village: true, subjects: true },
    });

    res.json({ success: true, data: { ...updated, role }, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { password: true } });
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

