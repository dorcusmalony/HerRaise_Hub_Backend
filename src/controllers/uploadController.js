const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// Format file size for display
const _formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to categorize file types
const _getFileCategory = (mimetype, originalname) => {
  const ext = originalname.toLowerCase().split('.').pop();
  
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext) || mimetype.includes('word')) return 'document';
  if (['ppt', 'pptx'].includes(ext) || mimetype.includes('presentation')) return 'slides';
  if (mimetype === 'text/plain' || ext === 'txt') return 'text';
  if (['mp3', 'wav', 'ogg'].includes(ext) || mimetype.startsWith('audio/')) return 'audio';
  return 'other';
};

// Get file icon based on type
const _getFileIcon = (category, _ext) => {
  const icons = {
    image: '',
    video: '',
    pdf: '',
    document: '',
    slides: '',
    text: '',
    audio: '',
    other: ''
  };
  return icons[category] || '';
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents, audio
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|pdf|doc|docx|ppt|pptx|txt|mp3|wav|ogg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = /^(image|video|audio)\//.test(file.mimetype) || 
                    ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'].includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: images, videos, documents, audio'));
    }
  }
});

// Upload single file
exports.uploadSingle = upload.single('file');

// Upload multiple files
exports.uploadMultiple = upload.array('files', 5);

// Handle file upload to Cloudinary
exports.handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'forum');
    
    res.json({
      success: true,
      url: result.secure_url,
      fileId: result.public_id,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Handle multiple files upload
exports.handleMultipleUpload = async (req, res) => {
  try {
    console.log('=== UPLOAD REQUEST START ===');
    console.log('Files received:', {
      filesCount: req.files ? req.files.length : 0,
      files: req.files ? req.files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })) : 'none'
    });

    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(async (file, index) => {
      try {
        console.log(`Uploading file ${index + 1}:`, file.originalname);
        const result = await uploadToCloudinary(file.buffer, 'forum');
        console.log(`File ${index + 1} uploaded successfully:`, result.public_id);
        return result;
      } catch (err) {
        console.error(`Error uploading file ${index + 1}:`, err);
        throw err;
      }
    });
    
    const results = await Promise.all(uploadPromises);
    
    const files = results.map((result, index) => ({
      url: result.secure_url,
      fileId: result.public_id,
      originalName: req.files[index].originalname,
      size: req.files[index].size,
      mimetype: req.files[index].mimetype
    }));

    console.log('Upload completed successfully:', files.length, 'files');
    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get file by ID
exports.getFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${fileId}`;
    
    res.json({
      success: true,
      url: cloudinaryUrl,
      fileId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Serve file directly (redirect to Cloudinary)
exports.serveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${fileId}`;
    res.redirect(cloudinaryUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

