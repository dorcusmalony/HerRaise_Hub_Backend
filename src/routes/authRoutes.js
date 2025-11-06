const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword, 
  changePassword,
  logout,
  validatePassword,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.put('/change-password', protect, changePassword);
router.post('/validate-password', validatePassword);

module.exports = router;