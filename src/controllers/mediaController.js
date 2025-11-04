const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for large videos
  },
  fileFilter: (req, file, cb) => {
    // Allow all common file types like forum upload
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff|svg|mp4|mov|avi|webm|mkv|flv|wmv|m4v|3gp|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|rtf|mp3|wav|ogg|aac|flac|m4a|zip|rar|7z|tar|gz/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    
    const allowedMimetypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv', 'video/3gpp',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/rtf',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'
    ];
    
    const mimetypeAllowed = allowedMimetypes.includes(file.mimetype) || /^(image|video|audio)\//.test(file.mimetype);
    
    if (mimetypeAllowed || extname) {
      cb(null, true);
    } else {
      console.log('Media upload rejected:', file.originalname, 'mimetype:', file.mimetype);
      cb(new Error(`Invalid file type: ${file.mimetype}. File: ${file.originalname}`), false);
    }
  }
});

// Upload single media file
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Automatically detect file type
          folder: 'forum_media',
          transformation: [
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(req.file.buffer);
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration // For videos
    });

  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message
    });
  }
};

// Upload multiple media files
exports.uploadMultipleMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'forum_media',
            transformation: [
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({
              url: result.secure_url,
              publicId: result.public_id,
              resourceType: result.resource_type,
              format: result.format,
              width: result.width,
              height: result.height,
              duration: result.duration,
              originalName: file.originalname,
              size: file.size,
              mimetype: file.mimetype
            });
          }
        );
        
        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      files: results
    });

  } catch (error) {
    console.error('Multiple media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media files',
      error: error.message
    });
  }
};

// Delete media file
exports.deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    await cloudinary.uploader.destroy(publicId);
    
    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete media',
      error: error.message
    });
  }
};

module.exports = { 
  upload,
  uploadMedia: exports.uploadMedia,
  uploadMultipleMedia: exports.uploadMultipleMedia,
  deleteMedia: exports.deleteMedia
};