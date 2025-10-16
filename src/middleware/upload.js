const multer = require('multer');
const path = require('path');

// Memory storage for direct upload to Cloudinary
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
};

const cloudinaryUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter,
});

module.exports = {
  uploadSingle: cloudinaryUpload.single('profilePicture'),
  uploadMultiple: cloudinaryUpload.array('images', 10),
};

// Document file filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only document files (pdf, doc, docx, txt) are allowed'));
};

// S3 upload configuration
const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `uploads/${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter,
});

// Local storage fallback (for development)
const localStorage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// Export based on environment
const upload = process.env.USE_S3 === 'true' ? uploadToS3 : localStorage;

module.exports = {
  uploadSingle: upload.single('file'),
  uploadProfilePicture: upload.single('profilePicture'),
  uploadMultiple: upload.array('files', 10),
  uploadFields: upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'documents', maxCount: 5 },
  ]),
};
