const db = require('../config/database');

// @desc    Get forum posts
// @route   GET /api/forum/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const { ForumPost, User } = db.models;
    const { filter = 'all', sort = 'recent', limit = 10 } = req.query;

    const where = {};
    if (filter !== 'all') {
      where.type = filter;
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'popular') {
      order = [['views', 'DESC'], ['createdAt', 'DESC']];
    }

    const posts = await ForumPost.findAll({
      where,
      order,
      limit: parseInt(limit, 10) || 10,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'profilePicture', 'role']
      }]
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create forum post
// @route   POST /api/forum/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { ForumPost, User } = db.models;
    const { title, content, type, tags } = req.body;

    const post = await ForumPost.create({
      title,
      content,
      type: type || 'discussion',
      tags: Array.isArray(tags) ? tags : [],
      authorId: req.user.id
    });

    await post.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'profilePicture', 'role']
      }]
    });

    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single post
// @route   GET /api/forum/posts/:id
// @access  Public
exports.getPost = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    
    const post = await ForumPost.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'profilePicture', 'role'] },
        { 
          model: ForumComment,
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'profilePicture'] }]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views
    post.views += 1;
    await post.save();

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update post
// @route   PUT /api/forum/posts/:id
// @access  Private (Author only)
exports.updatePost = async (req, res) => {
  try {
    const { ForumPost } = db.models;
    
    const post = await ForumPost.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.authorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { title, content, type, tags } = req.body;
    
    if (title) post.title = title;
    if (content) post.content = content;
    if (type) post.type = type;
    if (tags) post.tags = Array.isArray(tags) ? tags : [];

    await post.save();

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/forum/posts/:id
// @access  Private (Author/Admin only)
exports.deletePost = async (req, res) => {
  try {
    const { ForumPost } = db.models;
    
    const post = await ForumPost.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership or admin
    if (post.authorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.destroy();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
