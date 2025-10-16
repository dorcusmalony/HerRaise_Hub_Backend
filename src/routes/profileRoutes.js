const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture,
} = require('../controllers/profileController');

// All routes require authentication
router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/picture', uploadSingle, uploadProfilePicture);
router.delete('/picture', deleteProfilePicture);

module.exports = router;