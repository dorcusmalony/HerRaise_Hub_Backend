const express = require('express');
const router = express.Router();
const { 
  uploadSingle, 
  uploadMultiple
} = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Single file upload
router.post('/single', protect, uploadSingle);

// Multiple files upload
router.post('/multiple', protect, uploadMultiple);

module.exports = router;