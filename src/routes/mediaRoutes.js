const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadMedia, deleteMedia, upload } = require('../controllers/mediaController');

// Upload media (images/videos)
router.post('/upload', protect, upload.single('media'), uploadMedia);

// Delete media
router.delete('/:publicId', protect, deleteMedia);

module.exports = router;