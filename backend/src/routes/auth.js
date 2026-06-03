const express = require('express');
const router = express.Router();
const { registerInstitute, registerUser, login, getProfile, updateProfile, changePassword, forgotPassword, verifyResetToken, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register/institute', registerInstitute);
router.post('/register/user', registerUser);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.put('/change-password', auth, changePassword);
router.post('/forgot-password', forgotPassword);
router.get('/verify-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;
