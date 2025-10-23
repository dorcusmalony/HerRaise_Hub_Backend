const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');

// Helper function to categorize file types
const getFileCategory = (mimetype, originalname) => {
  const ext = originalname.toLowerCase().split('.').pop();
  
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'document';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  return 'other';
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
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|pdf|doc|docx|txt|mp3|wav|ogg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = /^(image|video|audio)\//.test(file.mimetype) || 
                    ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(file.mimetype);
    
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

// Upload to cloudinary
exports.uploadToCloudinary = async (req, res) => {
  try {
    if (!req.file && !req.files) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const files = req.files || [req.file];
    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'forum_uploads',
            public_id: `${Date.now()}_${file.originalname.split('.')[0]}`
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({
              url: result.secure_url,
              publicId: result.public_id,
              originalName: file.originalname,
              size: file.size,
              type: result.resource_type,
              format: result.format,
              category: getFileCategory(file.mimetype, file.originalname)
            });
          }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    
    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};