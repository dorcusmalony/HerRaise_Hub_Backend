const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadMedia, uploadMultipleMedia, deleteMedia, upload } = require('../controllers/mediaController');

// Upload single media file
router.post('/upload', protect, upload.single('media'), uploadMedia);

// Upload multiple media files  
router.post('/upload-multiple', protect, upload.array('media', 5), uploadMultipleMedia);

// Delete media
router.delete('/:publicId', protect, deleteMedia);

module.exports = router;