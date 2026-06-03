const express = require('express');
const router  = express.Router();
const { adminLogin, getAdminStats, getAllInstitutes, getAllUsers, toggleInstituteStatus, toggleUserStatus } = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });
  next();
};

router.post('/login',                        adminLogin);
router.get('/stats',        auth, adminOnly, getAdminStats);
router.get('/institutes',   auth, adminOnly, getAllInstitutes);
router.get('/users',        auth, adminOnly, getAllUsers);
router.patch('/institutes/:id/toggle', auth, adminOnly, toggleInstituteStatus);
router.patch('/users/:id/toggle',      auth, adminOnly, toggleUserStatus);

module.exports = router;
