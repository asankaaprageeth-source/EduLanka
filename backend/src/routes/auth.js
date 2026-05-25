const express = require('express');
const router = express.Router();
const { registerInstitute, registerUser, login, getProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register/institute', registerInstitute);
router.post('/register/user', registerUser);
router.post('/login', login);
router.get('/profile', auth, getProfile);

module.exports = router;
