const supabase = require('../config/supabase');
const multer = require('multer');

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to categorize file types
const getFileCategory = (mimetype, originalname) => {
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
const getFileIcon = (category, _ext) => {
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

// Upload to cloudinary
exports.uploadToCloudinary = async (req, res) => {
  try {
    console.log('Upload request received:', { files: req.files?.length || 0, file: !!req.file });
    
    if (!req.file && !req.files) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const files = req.files || [req.file];
    const uploadPromises = files.map(async (file) => {
      const fileName = `${Date.now()}_${file.originalname}`;
      
      const { data: _data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      const category = getFileCategory(file.mimetype, file.originalname);
      const ext = file.originalname.toLowerCase().split('.').pop();
      
      return {
        url: publicUrl,
        publicId: fileName,
        originalName: file.originalname,
        size: file.size,
        type: 'file',
        format: ext,
        category,
        extension: ext,
        icon: getFileIcon(category, ext),
        mimetype: file.mimetype,
        sizeFormatted: formatFileSize(file.size)
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    
    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload controller error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

