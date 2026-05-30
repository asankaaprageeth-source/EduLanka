const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const pool = require('../config/database');
require('dotenv').config();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// ── Email transporter ─────────────────────────────────────────────────────────
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

// ── Forgot Password ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // Rate-limit: max 3 active tokens per email per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // Search institutes first, then users
    let table = null;
    let userId = null;
    let userEmail = email.trim().toLowerCase();

    const [[instRow]] = await pool.execute(
      'SELECT id, email FROM institutes WHERE LOWER(email) = ? AND is_active = 1',
      [userEmail]
    );
    if (instRow) {
      table = 'institutes';
      userId = instRow.id;
    } else {
      const [[userRow]] = await pool.execute(
        'SELECT id, email FROM users WHERE LOWER(email) = ? AND is_active = 1',
        [userEmail]
      );
      if (userRow) {
        table = 'users';
        userId = userRow.id;
      }
    }

    // Always respond success to avoid email enumeration
    if (!table) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Check rate limit (max 3 tokens in last hour)
    const [[{ cnt }]] = await pool.execute(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE id = ? AND reset_token IS NOT NULL AND reset_token_expiry > ?`,
      [userId, hourAgo]
    );
    if (cnt >= 3) {
      return res.status(429).json({ success: false, message: 'Too many reset requests. Please try again in an hour.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      `UPDATE ${table} SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`,
      [token, expiry, userId]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    await sendResetEmail(email.trim(), resetLink);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Verify Reset Token ────────────────────────────────────────────────────────
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [[instRow]] = await pool.execute(
      'SELECT id FROM institutes WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, now]
    );
    if (instRow) return res.json({ success: true, valid: true });

    const [[userRow]] = await pool.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, now]
    );
    if (userRow) return res.json({ success: true, valid: true });

    res.json({ success: false, valid: false, message: 'Invalid or expired reset link.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [[instRow]] = await pool.execute(
      'SELECT id FROM institutes WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, now]
    );
    if (instRow) {
      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.execute(
        'UPDATE institutes SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
        [hashed, instRow.id]
      );
      return res.json({ success: true, message: 'Password reset successfully.' });
    }

    const [[userRow]] = await pool.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, now]
    );
    if (userRow) {
      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.execute(
        'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
        [hashed, userRow.id]
      );
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
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Register Institute
exports.registerInstitute = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const [existing] = await pool.execute('SELECT id FROM institutes WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    let institute_code = generateInstituteCode();

    const [codeCheck] = await pool.execute('SELECT id FROM institutes WHERE institute_code = ?', [institute_code]);
    while (codeCheck.length > 0) {
      institute_code = generateInstituteCode();
    }

    const [result] = await pool.execute(
      'INSERT INTO institutes (name, email, password, phone, address, institute_code) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, address || null, institute_code]
    );

    const token = generateToken({ id: result.insertId, role: 'institute', institute_id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Institute registered successfully.',
      data: { id: result.insertId, name, email, institute_code, role: 'institute' },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Register Student or Teacher
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
      const [institutes] = await pool.execute(
        'SELECT id FROM institutes WHERE institute_code = ? AND is_active = 1',
        [institute_code]
      );
      if (institutes.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid institute code.' });
      }
      institute_id = institutes[0].id;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const student_id = role === 'student' ? `STU${Date.now()}` : null;
    const subjectsJson = role === 'teacher' && subjects && subjects.length ? JSON.stringify(subjects) : null;

    const [result] = await pool.execute(
      'INSERT INTO users (institute_id, role, name, email, password, phone, parent_phone, student_id, district, city, village, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [institute_id, role, name, email || null, hashedPassword, phone || null, parent_phone || null, student_id, district || null, city || null, village || null, subjectsJson]
    );

    const userId = result.insertId;

    // Generate QR code for students
    if (role === 'student') {
      const qrData = JSON.stringify({ userId, student_id, institute_id });
      const qrCodePath = `./uploads/qr_${userId}.png`;
      await QRCode.toFile(qrCodePath, qrData);
      await pool.execute('UPDATE users SET qr_code = ? WHERE id = ?', [`qr_${userId}.png`, userId]);
    }

    const token = generateToken({ id: userId, role, institute_id });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully.`,
      data: { id: userId, name, email, role, institute_id, student_id },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Login - works for all roles
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user = null;
    let tokenPayload = null;

    if (role === 'institute') {
      const [rows] = await pool.execute(
        'SELECT * FROM institutes WHERE email = ? AND is_active = 1',
        [email]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      user = rows[0];
      tokenPayload = { id: user.id, role: 'institute', institute_id: user.id };
    } else {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ? AND role = ? AND is_active = 1',
        [email, role]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      user = rows[0];
      tokenPayload = { id: user.id, role: user.role, institute_id: user.institute_id };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(tokenPayload);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
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

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const { id, role, institute_id } = req.user;
    let data;

    if (role === 'institute') {
      const [rows] = await pool.execute(
        'SELECT id, name, email, phone, address, logo, institute_code, created_at FROM institutes WHERE id = ?',
        [id]
      );
      data = rows[0];
    } else {
      const [rows] = await pool.execute(
        'SELECT id, institute_id, role, name, email, phone, parent_phone, photo, qr_code, student_id, created_at FROM users WHERE id = ?',
        [id]
      );
      data = rows[0];
    }

    res.json({ success: true, data: { ...data, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
