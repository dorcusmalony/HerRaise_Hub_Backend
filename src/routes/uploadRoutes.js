const express = require('express');
const router = express.Router();
const { 
  uploadSingle, 
  uploadMultiple, 
  handleFileUpload, 
  handleMultipleUpload,
  getFile,
  serveFile,
  testSupabase
} = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Single file upload
router.post('/single', protect, uploadSingle, handleFileUpload);

// Multiple files upload
router.post('/multiple', protect, uploadMultiple, handleMultipleUpload);

// Get file URL by ID
router.get('/file/:fileId', getFile);

// Serve file directly
router.get('/serve/:fileId', serveFile);

// Test Supabase connection
router.get('/test', testSupabase);

module.exports = router;