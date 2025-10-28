const express = require('express');
const router = express.Router();
const { 
  uploadSingle, 
  uploadMultiple,
  handleFileUpload,
  handleMultipleUpload
} = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Single file upload
router.post('/single', protect, uploadSingle, handleFileUpload);

// Multiple files upload
router.post('/multiple', protect, uploadMultiple, handleMultipleUpload);

module.exports = router;