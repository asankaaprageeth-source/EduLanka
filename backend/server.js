const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
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

app.get('/api/health', (req, res) => res.json({ status: 'OK', app: 'EduLanka API' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EduLanka API running on http://localhost:${PORT}`);
});
