const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://edulanka-frontend.onrender.com').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('CORS: origin not allowed'))),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/institute', require('./src/routes/institute'));
app.use('/api/teacher', require('./src/routes/teacher'));
app.use('/api/student', require('./src/routes/student'));
app.use('/api/attendance', require('./src/routes/attendance'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/exams', require('./src/routes/exams'));
app.use('/api/institutes', require('./src/routes/institutes'));
app.use('/api/connections', require('./src/routes/connections'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', app: 'EduLanka API' }));

app.get('/api/db-test', async (req, res) => {
  const prisma = require('./src/config/prisma');
  try {
    await prisma.$connect();
    const count = await prisma.institute.count();
    res.json({ status: 'DB OK', institute_count: count });
  } catch (err) {
    res.status(500).json({ status: 'DB ERROR', error: err.message, code: err.code });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EduLanka API running on http://localhost:${PORT}`);
});
