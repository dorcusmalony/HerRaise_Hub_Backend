const db = require('../config/database');

// Helper to get localized content (English/Juba Arabic)
function getLocalizedContent(obj, field, lang) {
  if (!obj) return '';
  if (lang === 'ar' && obj[`${field}_ar`]) return obj[`${field}_ar`];
  return obj[field] || '';
}

// @desc    Get supported languages for forum
// @route   GET /api/forum/languages
// @access  Public
exports.getSupportedLanguages = (_req, res) => {
  res.status(200).json({
    success: true,
    languages: [
      { code: 'en', name: 'English' },
      { code: 'ar', name: 'Juba Arabic' }
    ]
  });
};

// @desc    Get forum posts
// @route   GET /api/forum/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    const { filter = 'all', sort = 'recent', limit = 10 } = req.query;
    const lang = req.query.lang || req.headers['accept-language']?.split(',')[0] || 'en';

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
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'profilePicture', 'role']
        },
        {
          model: ForumComment,
          where: { parentCommentId: null },
          required: false,
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'name', 'profilePicture', 'role']
            },
            {
              model: ForumComment,
              as: 'replies',
              include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'name', 'profilePicture', 'role']
              }]
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    // Format response with likes, views, viewers count
    const formattedPosts = posts.map(post => {
      const postData = post.toJSON();
      // Localize title/content
      postData.title = getLocalizedContent(postData, 'title', lang);
      postData.content = getLocalizedContent(postData, 'content', lang);
      // Always include both language fields for frontend switching
      postData.title_en = postData.title;
      postData.title_ar = postData.title_ar || '';
      postData.content_en = postData.content;
      postData.content_ar = postData.content_ar || '';
      // Localize comments and replies
      if (postData.ForumComments) {
        postData.ForumComments = postData.ForumComments.map(comment => {
          comment.content = getLocalizedContent(comment, 'content', lang);
          comment.content_en = comment.content;
          comment.content_ar = comment.content_ar || '';
          if (comment.replies) {
            comment.replies = comment.replies.map(reply => {
              reply.content = getLocalizedContent(reply, 'content', lang);
              reply.content_en = reply.content;
              reply.content_ar = reply.content_ar || '';
              return reply;
            });
          }
          return comment;
        });
      }
      return {
        ...postData,
        likesCount: (postData.likes || []).length,
        commentsCount: (postData.ForumComments || []).length,
        viewsCount: postData.views || 0,
        viewersCount: (postData.viewers || []).length,
        attachmentsCount: (postData.attachments || []).length,
        hasAttachments: (postData.attachments || []).length > 0
      };
    });

    res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts
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
    const { title, content, type, tags, title_ar, content_ar, attachments } = req.body;

    const post = await ForumPost.create({
      title,
      content,
      title_ar: title_ar || null,
      content_ar: content_ar || null,
      type: type || 'discussion',
      tags: Array.isArray(tags) ? tags : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      authorId: req.user.id
    });

    await post.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'profilePicture', 'role']
      }]
    });

    // Send notification to all users about new post
    console.log('📝 Creating forum post notification for:', title);
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyNewForumQuestion(
      {
        id: post.id,
        title: title,
        author: {
          name: req.user.name
        }
      },
      req.user.id
    );
    console.log('✅ Forum post notification sent');

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
    const lang = req.query.lang || req.headers['accept-language']?.split(',')[0] || 'en';

    const post = await ForumPost.findByPk(req.params.id, {
      include: [
        { 
          model: User, 
          as: 'author', 
          attributes: ['id', 'name', 'profilePicture', 'role'] 
        },
        { 
          model: ForumComment,
          where: { parentCommentId: null },
          required: false,
          include: [
            { 
              model: User, 
              as: 'author', 
              attributes: ['id', 'name', 'profilePicture', 'role'] 
            },
            {
              model: ForumComment,
              as: 'replies',
              include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'name', 'profilePicture', 'role']
              }],
              order: [['createdAt', 'ASC']]
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Track unique viewers
    const userId = req.user ? req.user.id : req.ip;
    const viewers = post.viewers || [];
    if (userId && !viewers.includes(userId)) {
      viewers.push(userId);
      post.viewers = viewers;
    }

    // Increment views
    post.views = (post.views || 0) + 1;
    await post.save();

    // Format with counts and localization
    const postData = post.toJSON();
    postData.title = getLocalizedContent(postData, 'title', lang);
    postData.content = getLocalizedContent(postData, 'content', lang);
    postData.title_en = postData.title;
    postData.title_ar = postData.title_ar || '';
    postData.content_en = postData.content;
    postData.content_ar = postData.content_ar || '';
    if (postData.ForumComments) {
      postData.ForumComments = postData.ForumComments.map(comment => {
        comment.content = getLocalizedContent(comment, 'content', lang);
        comment.content_en = comment.content;
        comment.content_ar = comment.content_ar || '';
        if (comment.replies) {
          comment.replies = comment.replies.map(reply => {
            reply.content = getLocalizedContent(reply, 'content', lang);
            reply.content_en = reply.content;
            reply.content_ar = reply.content_ar || '';
            return reply;
          });
        }
        return comment;
      });
    }
    const formattedPost = {
      ...postData,
      likesCount: (postData.likes || []).length,
      commentsCount: (postData.ForumComments || []).length,
      viewsCount: postData.views,
      viewersCount: (postData.viewers || []).length,
      attachmentsCount: (postData.attachments || []).length,
      hasAttachments: (postData.attachments || []).length > 0
    };

    res.status(200).json({
      success: true,
      post: formattedPost
    });
  } catch (error) {
    console.error('Get post error:', error);
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

    const { title, content, type, tags, attachments } = req.body;
    
    if (title) post.title = title;
    if (content) post.content = content;
    if (type) post.type = type;
    if (tags) post.tags = Array.isArray(tags) ? tags : [];
    if (attachments) post.attachments = Array.isArray(attachments) ? attachments : [];

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

// @desc    Add comment to post
// @route   POST /api/forum/posts/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { ForumComment, ForumPost, User } = db.models;
    const { content, parentCommentId, content_ar } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    // Check if post exists
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is locked
    if (post.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This post is locked and cannot receive new comments'
      });
    }

    // Create comment (can be a reply if parentCommentId is provided)
    const comment = await ForumComment.create({
      content,
      content_ar: content_ar || null,
      postId: req.params.id,
      authorId: req.user.id,
      parentCommentId: parentCommentId || null
    });

    // Load with author info and replies
    await comment.reload({
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'profilePicture', 'role'] },
        {
          model: ForumComment,
          as: 'replies',
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'profilePicture', 'role']
          }]
        }
      ]
    });

    // Check if replying user is the post author
    const isPostAuthor = post.authorId.toString() === req.user.id;

    res.status(201).json({
      success: true,
      comment: {
        ...comment.toJSON(),
        likesCount: (comment.likes || []).length,
        isPostAuthorReply: isPostAuthor && parentCommentId !== null
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update comment
// @route   PUT /api/forum/comments/:id
// @access  Private (Author only)
exports.updateComment = async (req, res) => {
  try {
    const { ForumComment } = db.models;
    const { content } = req.body;

    const comment = await ForumComment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.authorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    if (content) {
      comment.content = content;
      await comment.save();
    }

    res.status(200).json({
      success: true,
      comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/forum/comments/:id
// @access  Private (Author/Admin only)
exports.deleteComment = async (req, res) => {
  try {
    const { ForumComment } = db.models;

    const comment = await ForumComment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership or admin
    if (comment.authorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await comment.destroy();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like/Unlike post
// @route   POST /api/forum/posts/:id/like
// @access  Private
exports.togglePostLike = async (req, res) => {
  try {
    const { ForumPost } = db.models;
    
    const post = await ForumPost.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likes = post.likes || [];
    const userIdStr = req.user.id.toString();
    const likeIndex = likes.findIndex(id => id.toString() === userIdStr);

    if (likeIndex > -1) {
      // Unlike
      likes.splice(likeIndex, 1);
    } else {
      // Like
      likes.push(req.user.id);
    }

    post.likes = likes;
    await post.save();

    res.status(200).json({
      success: true,
      liked: likeIndex === -1,
      likesCount: likes.length,
      likes: likes
    });
  } catch (error) {
    console.error('Toggle post like error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like/Unlike comment
// @route   POST /api/forum/comments/:id/like
// @access  Private
exports.toggleCommentLike = async (req, res) => {
  try {
    const { ForumComment } = db.models;
    
    const comment = await ForumComment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const likes = comment.likes || [];
    const userIdStr = req.user.id.toString();
    const likeIndex = likes.findIndex(id => id.toString() === userIdStr);

    if (likeIndex > -1) {
      // Unlike
      likes.splice(likeIndex, 1);
    } else {
      // Like
      likes.push(req.user.id);
    }

    comment.likes = likes;
    await comment.save();

    res.status(200).json({
      success: true,
      liked: likeIndex === -1,
      likesCount: likes.length,
      likes: likes
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create feedback post with attachments
// @route   POST /api/forum/posts/feedback
// @access  Private
exports.createFeedbackPost = async (req, res) => {
  try {
    const { ForumPost, User } = db.models;
    const { title, content, attachments, tags } = req.body;

    const post = await ForumPost.create({
      title,
      content,
      type: 'feedback',
      tags: Array.isArray(tags) ? tags : [],
      attachments: Array.isArray(attachments) ? attachments : [],
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

// @desc    Get feedback posts
// @route   GET /api/forum/posts/feedback
// @access  Public
exports.getFeedbackPosts = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    const { limit = 10 } = req.query;
    const lang = req.query.lang || req.headers['accept-language']?.split(',')[0] || 'en';

    const posts = await ForumPost.findAll({
      where: { type: 'feedback' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10) || 10,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'profilePicture', 'role']
        },
        {
          model: ForumComment,
          where: { parentCommentId: null },
          required: false,
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'name', 'profilePicture', 'role']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    const formattedPosts = posts.map(post => {
      const postData = post.toJSON();
      postData.title = getLocalizedContent(postData, 'title', lang);
      postData.content = getLocalizedContent(postData, 'content', lang);
      
      return {
        ...postData,
        likesCount: (postData.likes || []).length,
        commentsCount: (postData.ForumComments || []).length,
        viewsCount: postData.views || 0,
        attachmentsCount: (postData.attachments || []).length
      };
    });

    res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts
    });
  } catch (error) {
    console.error('Get feedback posts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
