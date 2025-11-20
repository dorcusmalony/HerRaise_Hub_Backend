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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept any file type
  }
});

// GET /api/sharezone - Fetch all ShareZone posts with comments
router.get('/', async (req, res) => {
  try {
    const posts = await models.ShareZone.findAll({
      include: [
        {
          model: models.User,
          as: 'authorData',
          attributes: ['id', 'name', 'profilePicture']
        },
        {
          model: models.ShareZoneComment,
          where: { parentCommentId: null },
          required: false,
          include: [
            {
              model: models.User,
              as: 'authorData',
              attributes: ['id', 'name', 'profilePicture']
            },
            {
              model: models.ShareZoneComment,
              as: 'replies',
              include: [{
                model: models.User,
                as: 'authorData',
                attributes: ['id', 'name', 'profilePicture']
              }]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform to match expected format
    const transformedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      category: post.category,
      fileUrl: post.fileUrl,
      externalLinks: post.externalLinks || [],
      linkType: post.linkType || 'file',
      author: post.authorData,
      createdAt: post.createdAt,
      ShareZoneComments: post.ShareZoneComments || []
    }));

    res.json({ posts: transformedPosts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sharezone/:id - Get single ShareZone post with comments
router.get('/:id', async (req, res) => {
  try {
    const post = await models.ShareZone.findByPk(req.params.id, {
      include: [
        {
          model: models.User,
          as: 'authorData',
          attributes: ['id', 'name', 'profilePicture']
        },
        {
          model: models.ShareZoneComment,
          where: { parentCommentId: null },
          required: false,
          include: [
            {
              model: models.User,
              as: 'authorData',
              attributes: ['id', 'name', 'profilePicture']
            },
            {
              model: models.ShareZoneComment,
              as: 'replies',
              include: [{
                model: models.User,
                as: 'authorData',
                attributes: ['id', 'name', 'profilePicture']
              }]
            }
          ]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      _id: post._id,
      title: post.title,
      content: post.content,
      category: post.category,
      fileUrl: post.fileUrl,
      externalLinks: post.externalLinks || [],
      linkType: post.linkType || 'file',
      author: post.authorData,
      createdAt: post.createdAt,
      ShareZoneComments: post.ShareZoneComments || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sharezone - Create new ShareZone content with file upload or external links
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, content, category, externalLinks, linkType } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validCategories = ['essays', 'projects', 'videos', 'resumes', 'cover-letters'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let fileUrl = null;
    let parsedExternalLinks = [];
    let finalLinkType = 'file';

    // Handle external links (Google Drive, OneDrive, etc.)
    if (externalLinks) {
      try {
        parsedExternalLinks = typeof externalLinks === 'string' ? JSON.parse(externalLinks) : externalLinks;
        finalLinkType = linkType || 'external';
      } catch (e) {
        return res.status(400).json({ error: 'Invalid external links format' });
      }
    }

    // Handle file upload
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'sharezone');
        fileUrl = result.secure_url;
        finalLinkType = 'file';
      } catch (uploadError) {
        console.error('File upload failed:', uploadError.message);
        return res.status(400).json({ 
          error: 'File upload failed. Please try a smaller file or try again later.' 
        });
      }
    }

    const post = await models.ShareZone.create({
      title,
      content: content || '',
      category,
      fileUrl,
      externalLinks: parsedExternalLinks,
      linkType: finalLinkType,
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
      externalLinks: postWithAuthor.externalLinks || [],
      linkType: postWithAuthor.linkType || 'file',
      author: postWithAuthor.authorData,
      createdAt: postWithAuthor.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/sharezone/:id - Update ShareZone post
router.put('/:id', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    const post = await models.ShareZone.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this post' });
    }

    const validCategories = ['essays', 'projects', 'videos', 'resumes', 'cover-letters'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (title) post.title = title;
    if (content !== undefined) post.content = content;
    if (category) post.category = category;

    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'sharezone');
        post.fileUrl = result.secure_url;
      } catch (uploadError) {
        console.error('File upload failed:', uploadError.message);
        return res.status(400).json({ 
          error: 'File upload failed. Please try a smaller file or try again later.' 
        });
      }
    }

    await post.save();

    const updatedPost = await models.ShareZone.findByPk(post._id, {
      include: [{
        model: models.User,
        as: 'authorData',
        attributes: ['id', 'name', 'profilePicture']
      }]
    });

    res.json({
      _id: updatedPost._id,
      title: updatedPost.title,
      content: updatedPost.content,
      category: updatedPost.category,
      fileUrl: updatedPost.fileUrl,
      author: updatedPost.authorData,
      createdAt: updatedPost.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sharezone/:id - Delete ShareZone post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await models.ShareZone.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete all comments first
    await models.ShareZoneComment.destroy({
      where: { post: req.params.id }
    });

    // Delete the post
    await post.destroy();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sharezone/:id/comments - Add comment to ShareZone post
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = await models.ShareZone.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await models.ShareZoneComment.create({
      content,
      post: req.params.id,
      author: req.user.id,
      parentCommentId: parentCommentId || null,
      likes: []
    });

    const commentWithAuthor = await models.ShareZoneComment.findByPk(comment._id, {
      include: [{
        model: models.User,
        as: 'authorData',
        attributes: ['id', 'name', 'profilePicture']
      }]
    });

    res.status(201).json(commentWithAuthor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/sharezone/comments/:id - Update comment
router.put('/comments/:id', protect, async (req, res) => {
  try {
    const { content } = req.body;
    
    const comment = await models.ShareZoneComment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    if (content) {
      comment.content = content;
      await comment.save();
    }

    const updatedComment = await models.ShareZoneComment.findByPk(comment._id, {
      include: [{
        model: models.User,
        as: 'authorData',
        attributes: ['id', 'name', 'profilePicture']
      }]
    });

    res.json(updatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sharezone/comments/:id - Delete comment and replies
router.delete('/comments/:id', protect, async (req, res) => {
  try {
    const comment = await models.ShareZoneComment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete all replies first (cascade delete)
    await models.ShareZoneComment.destroy({
      where: { parentCommentId: req.params.id }
    });

    // Delete the comment itself
    await comment.destroy();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sharezone/comments/:id/like - Toggle like on comment
router.post('/comments/:id/like', protect, async (req, res) => {
  try {
    const comment = await models.ShareZoneComment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likes = comment.likes || [];
    const userLikeIndex = likes.findIndex(like => like.userId === req.user.id);

    if (userLikeIndex > -1) {
      // Unlike
      likes.splice(userLikeIndex, 1);
    } else {
      // Like
      likes.push({ userId: req.user.id, createdAt: new Date() });
    }

    comment.likes = likes;
    await comment.save();

    res.json({
      liked: userLikeIndex === -1,
      likesCount: likes.length,
      likes: likes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;