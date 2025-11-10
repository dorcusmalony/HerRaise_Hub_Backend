const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { models } = require('../config/database');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept any file type
  }
});

// GET /api/sharezone - Fetch all ShareZone posts
router.get('/', async (req, res) => {
  try {
    const posts = await models.ShareZone.findAll({
      include: [{
        model: models.User,
        as: 'authorData',
        attributes: ['id', 'name', 'profilePicture']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Transform to match expected format
    const transformedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      category: post.category,
      fileUrl: post.fileUrl,
      author: post.authorData,
      createdAt: post.createdAt
    }));

    res.json({ posts: transformedPosts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sharezone - Create new ShareZone content with file upload
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validCategories = ['project', 'essay', 'resume', 'video', 'document', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let fileUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'sharezone');
      fileUrl = result.secure_url;
    }

    const post = await models.ShareZone.create({
      title,
      content: content || '',
      category,
      fileUrl,
      author: req.user.id
    });

    const postWithAuthor = await models.ShareZone.findByPk(post._id, {
      include: [{
        model: models.User,
        as: 'authorData',
        attributes: ['id', 'name', 'profilePicture']
      }]
    });

    res.status(201).json({
      _id: postWithAuthor._id,
      title: postWithAuthor.title,
      content: postWithAuthor.content,
      category: postWithAuthor.category,
      fileUrl: postWithAuthor.fileUrl,
      author: postWithAuthor.authorData,
      createdAt: postWithAuthor.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;