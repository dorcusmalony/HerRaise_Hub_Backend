const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword, 
  changePassword,
  logout 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.put('/change-password', protect, changePassword);

module.exports = router;