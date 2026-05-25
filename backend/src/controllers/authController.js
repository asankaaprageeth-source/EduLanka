const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const pool = require('../config/database');
require('dotenv').config();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
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
    const { name, email, password, phone, parent_phone, role, institute_code } = req.body;

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const [institutes] = await pool.execute(
      'SELECT id FROM institutes WHERE institute_code = ? AND is_active = 1',
      [institute_code]
    );
    if (institutes.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid institute code.' });
    }
    const institute_id = institutes[0].id;

    const hashedPassword = await bcrypt.hash(password, 12);
    const student_id = role === 'student' ? `STU${Date.now()}` : null;

    const [result] = await pool.execute(
      'INSERT INTO users (institute_id, role, name, email, password, phone, parent_phone, student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [institute_id, role, name, email || null, hashedPassword, phone || null, parent_phone || null, student_id]
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
