const multer = require('multer');

// Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// File filter for images only
const imageFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// File filter for documents only
const documentFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only document files (pdf, doc, docx, txt) are allowed'));
};

// Multer configuration for Cloudinary upload
const cloudinaryUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter,
});

const documentUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: documentFilter,
});

module.exports = {
  uploadSingle: cloudinaryUpload.single('profilePicture'),
  uploadMultiple: cloudinaryUpload.array('images', 10),
  uploadDocument: documentUpload.single('document'),
  uploadDocuments: documentUpload.array('documents', 5),
};

// Use memory storage for Cloudinary upload
module.exports = {
  uploadSingle: cloudinaryUpload.single('profilePicture'),
  uploadMultiple: cloudinaryUpload.array('images', 10),
  uploadDocument: documentUpload.single('document'),
  uploadDocuments: documentUpload.array('documents', 5),
};
