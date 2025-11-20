const db = require('../config/database');
const { Op } = require('sequelize');

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

// @desc    Get forum categories
// @route   GET /api/forum/categories
// @access  Public
exports.getCategories = (_req, res) => {
  res.status(200).json({
    success: true,
    categories: [
      { id: 'mental-health', name: 'Mental Health & Wellbeing', icon: '🧠' },
      { id: 'leadership', name: 'Leadership & Empowerment', icon: '👑' },
      { id: 'education-study', name: 'Education & Learning', icon: '📚' },
      { id: 'equality-rights', name: 'Equality, Equity & Rights', icon: '⚖️' },
      { id: 'career-skills', name: 'Career & Skills', icon: '💼' },
      { id: 'womens-health', name: "Women's Health", icon: '🌸' }
    ]
  });
};

// @desc    Get posts by category
// @route   GET /api/forum/categories/:category/posts
// @access  Public
exports.getPostsByCategory = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    const { category } = req.params;
    const { sort = 'recent', limit = 20, page = 1, type = 'all' } = req.query;
    const lang = req.query.lang || req.headers['accept-language']?.split(',')[0] || 'en';

    const validCategories = ['mental-health', 'leadership', 'education-study', 'equality-rights', 'career-skills', 'womens-health'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Category display names
    const categoryNames = {
      'mental-health': 'Mental Health & Wellbeing',
      'leadership': 'Leadership & Empowerment', 
      'education-study': 'Education & Learning',
      'equality-rights': 'Equality, Equity & Rights',
      'career-skills': 'Career & Skills',
      'womens-health': "Women's Health"
    };

    let order = [['createdAt', 'DESC']];
    if (sort === 'popular') {
      order = [['views', 'DESC'], ['createdAt', 'DESC']];
    } else if (sort === 'most-liked') {
      order = [['createdAt', 'DESC']];
    }

    // Build where clause
    const where = {
      category,
      type: ['discussion', 'question', 'announcement', 'project']
    };
    
    if (type !== 'all' && ['discussion', 'question', 'announcement', 'project'].includes(type)) {
      where.type = type;
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10) || 20;

    const { count, rows: posts } = await ForumPost.findAndCountAll({
      where,
      order,
      limit: limitNum,
      offset,
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

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    
    const formattedPosts = posts.map(post => {
      const postData = post.toJSON();
      postData.cardColor = colors[post.id.charCodeAt(0) % colors.length];
      postData.title = getLocalizedContent(postData, 'title', lang);
      postData.content = getLocalizedContent(postData, 'content', lang);
      postData.categoryName = categoryNames[category];
      postData.publishedFrom = `Published from ${categoryNames[category]}`;
      
      // Include both language versions for frontend switching
      postData.title_en = postData.title;
      postData.title_ar = postData.title_ar || '';
      postData.content_en = postData.content;
      postData.content_ar = postData.content_ar || '';
      
      // Localize comments
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
      
      const likesCount = (postData.likes || []).length;
      const commentsCount = (postData.ForumComments || []).length;
      const viewsCount = postData.views || 0;
      
      return {
        ...postData,
        likesCount,
        commentsCount,
        viewsCount,
        viewersCount: (postData.viewers || []).length,
        attachmentsCount: (postData.attachments || []).length,
        hasAttachments: (postData.attachments || []).length > 0,
        likesText: `${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`,
        commentsText: `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`,
        viewsText: `${viewsCount} ${viewsCount === 1 ? 'view' : 'views'}`,
        isLikedByUser: req.user ? (postData.likes || []).includes(req.user.id) : false
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = parseInt(page, 10) < totalPages;
    const hasPrevPage = parseInt(page, 10) > 1;

    // Disable caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.status(200).json({
      success: true,
      category,
      categoryName: categoryNames[category],
      count: formattedPosts.length,
      totalCount: count,
      posts: formattedPosts,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get posts by category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get forum posts
// @route   GET /api/forum/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    const { filter = 'all', sort = 'recent', limit = 10, category } = req.query;
    const lang = req.query.lang || req.headers['accept-language']?.split(',')[0] || 'en';

    const where = {
      type: ['discussion', 'question', 'announcement', 'project']
    };
    if (filter !== 'all' && ['discussion', 'question', 'announcement', 'project'].includes(filter)) {
      where.type = filter;
    }
    if (category && ['mental-health', 'leadership', 'education-study', 'equality-rights', 'career-skills', 'womens-health'].includes(category)) {
      where.category = category;
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'popular') {
      order = [['createdAt', 'DESC']];
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
          ]
        }
      ]
    });

    // Format response with likes, views, viewers count
    const categoryNames = {
      'personal-growth': 'Personal Growth & Learning',
      'mental-health': 'Mental Health & Wellbeing', 
      'education-study': 'Education & Study Tips',
      'career-future': 'Career & Future Opportunities'
    };
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    
    const formattedPosts = posts.map((post, index) => {
      const postData = post.toJSON();
      // Assign color based on post ID or index
      postData.cardColor = colors[post.id.charCodeAt(0) % colors.length];
      // Localize title/content
      postData.title = getLocalizedContent(postData, 'title', lang);
      postData.content = getLocalizedContent(postData, 'content', lang);
      // Add category display name
      postData.categoryName = postData.category ? categoryNames[postData.category] : null;
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
        hasAttachments: (postData.attachments || []).length > 0,
        publishedFrom: postData.categoryName ? `Published from ${postData.categoryName}` : null
      };
    });

    // Disable caching for forum posts to show new posts immediately
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts,
      timestamp: new Date().toISOString()
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
    const { title, content, type, tags, title_ar, content_ar, attachments, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const validCategories = ['mental-health', 'leadership', 'education-study', 'equality-rights', 'career-skills', 'womens-health'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const post = await ForumPost.create({
      title,
      content,
      title_ar: title_ar || null,
      content_ar: content_ar || null,
      type: type || 'discussion',
      category: category || null,
      tags: Array.isArray(tags) ? tags : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      authorId: req.user.id
    });

    console.log(`📝 Forum post created with category: ${category}`);

    await post.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'profilePicture', 'role']
      }]
    });

    // Send notification to all users about new post
    const categoryNames = {
      'mental-health': 'Mental Health & Wellbeing',
      'leadership': 'Leadership & Empowerment', 
      'education-study': 'Education & Learning',
      'equality-rights': 'Equality, Equity & Rights',
      'career-skills': 'Career & Skills',
      'womens-health': "Women's Health"
    };
    
    const categoryName = category ? categoryNames[category] : 'General Discussion';
    console.log(`📝 Creating forum post notification for: ${title} in ${categoryName}`);
    
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyNewForumQuestion(
      {
        id: post.id,
        title: title,
        category: categoryName,
        author: {
          name: req.user.name
        }
      },
      req.user.id
    );
    console.log('✅ Forum post notification sent');

    // Format response with category info
    const postData = post.toJSON();
    postData.categoryName = categoryName;
    postData.publishedFrom = category ? `Published from ${categoryName}` : null;

    res.status(201).json({
      success: true,
      post: postData
    });
  } catch (error) {
    console.error('Create post error:', error);
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
    const likesCount = (postData.likes || []).length;
    const commentsCount = (postData.ForumComments || []).length;
    const viewsCount = postData.views || 0;
    
    const formattedPost = {
      ...postData,
      likesCount,
      commentsCount,
      viewsCount,
      viewersCount: (postData.viewers || []).length,
      attachmentsCount: (postData.attachments || []).length,
      hasAttachments: (postData.attachments || []).length > 0,
      likesText: `${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`,
      commentsText: `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`,
      viewsText: `${viewsCount} ${viewsCount === 1 ? 'view' : 'views'}`,
      isLikedByUser: req.user ? (postData.likes || []).includes(req.user.id) : false
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
    const { ForumComment, ForumPost, User, Notification } = db.models;
    const { content, parentCommentId, content_ar } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    // Check if post exists
    const post = await ForumPost.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }]
    });
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

    // Prevent duplicate comments (same user, same content, within 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const recentComment = await ForumComment.findOne({
      where: {
        postId: req.params.id,
        authorId: req.user.id,
        content,
        createdAt: { [require('sequelize').Op.gte]: thirtySecondsAgo }
      }
    });

    if (recentComment) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate comment detected. Please wait before posting again.'
      });
    }

    // Get parent comment if replying
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await ForumComment.findByPk(parentCommentId, {
        include: [{ model: User, as: 'author', attributes: ['id', 'name'] }]
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

    // Send notification to post author (if not commenting on own post)
    if (post.authorId.toString() !== req.user.id.toString()) {
      try {
        await Notification.create({
          userId: post.authorId,
          type: 'forum_comment',
          title: parentCommentId ? 'New reply on your post' : 'New comment on your post',
          message: parentCommentId 
            ? `${req.user.name} replied to a comment on your post "${post.title.substring(0, 40)}${post.title.length > 40 ? '...' : ''}"` 
            : `${req.user.name} commented on your post "${post.title.substring(0, 40)}${post.title.length > 40 ? '...' : ''}"`,
          data: {
            postId: post.id,
            postTitle: post.title,
            commentId: comment.id,
            commenterName: req.user.name,
            commenterId: req.user.id,
            isReply: !!parentCommentId
          },
          relatedId: post.id,
          link: `/forum/posts/${post.id}`
        });
        console.log(`📢 Comment notification created for user ${post.authorId}`);
      } catch (notifError) {
        console.error('❌ Failed to create comment notification:', notifError.message);
      }
    }

    // Send notification to parent comment author (if replying and not to self)
    if (parentComment && parentComment.authorId.toString() !== req.user.id.toString()) {
      try {
        await Notification.create({
          userId: parentComment.authorId,
          type: 'forum_reply',
          title: 'Someone replied to your comment',
          message: `${req.user.name} replied to your comment on "${post.title.substring(0, 40)}${post.title.length > 40 ? '...' : ''}"`,
          data: {
            postId: post.id,
            postTitle: post.title,
            commentId: comment.id,
            parentCommentId: parentCommentId,
            replierName: req.user.name,
            replierId: req.user.id
          },
          relatedId: post.id,
          link: `/forum/posts/${post.id}`
        });
        console.log(`📢 Reply notification created for user ${parentComment.authorId}`);
      } catch (notifError) {
        console.error('❌ Failed to create reply notification:', notifError.message);
      }
    }



    // Check if replying user is the post author
    const isPostAuthor = post.authorId.toString() === req.user.id;

    res.status(201).json({
      success: true,
      comment: {
        ...comment.toJSON(),
        likesCount: (comment.likes || []).length,
        isPostAuthorReply: isPostAuthor && parentCommentId !== null
      },
      message: parentCommentId ? 'Reply added successfully' : 'Comment added successfully'
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
    const { ForumPost, User, Notification, ForumComment } = db.models;
    
    const post = await ForumPost.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likes = post.likes || [];
    const userIdStr = req.user.id.toString();
    const likeIndex = likes.findIndex(id => id.toString() === userIdStr);
    const isLiking = likeIndex === -1;

    if (likeIndex > -1) {
      // Unlike
      likes.splice(likeIndex, 1);
    } else {
      // Like
      likes.push(req.user.id);
    }

    post.likes = likes;
    post.changed('likes', true); // Mark as changed for JSON field
    await post.save();

    // Send notification for new like (not unlike) and not to self
    if (isLiking && post.authorId.toString() !== req.user.id.toString()) {
      try {
        await Notification.create({
          userId: post.authorId,
          type: 'forum_like',
          title: 'Someone liked your post',
          message: `${req.user.name} liked your post "${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}"`,
          data: {
            postId: post.id,
            postTitle: post.title,
            likerName: req.user.name,
            likerId: req.user.id
          },
          relatedId: post.id,
          link: `/forum/posts/${post.id}`
        });
        console.log(`📢 Like notification created for user ${post.authorId} - post: ${post.title}`);
      } catch (notifError) {
        console.error('❌ Failed to create like notification:', notifError.message);
      }
    }

    // Notify users who commented on this post
    if (isLiking) {
      const commenters = await ForumComment.findAll({
        where: { postId: post.id },
        attributes: ['authorId'],
        group: ['authorId']
      });
      
      for (const commenter of commenters) {
        if (commenter.authorId !== req.user.id && commenter.authorId !== post.authorId) {
          await Notification.create({
            userId: commenter.authorId,
            type: 'forum_like',
            title: 'Activity on a post you commented on',
            message: `${req.user.name} liked a post you participated in`,
            data: { postId: post.id, postTitle: post.title },
            relatedId: post.id,
            link: `/forum/posts/${post.id}`
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      liked: isLiking,
      likesCount: likes.length,
      message: isLiking ? `You liked this post (${likes.length} ${likes.length === 1 ? 'like' : 'likes'})` : `You unliked this post (${likes.length} ${likes.length === 1 ? 'like' : 'likes'})`
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
    const { ForumComment, User, Notification, ForumPost } = db.models;
    
    const comment = await ForumComment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: ForumPost, attributes: ['id', 'title'] }
      ]
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const likes = comment.likes || [];
    const userIdStr = req.user.id.toString();
    const likeIndex = likes.findIndex(id => id.toString() === userIdStr);
    const isLiking = likeIndex === -1;

    if (likeIndex > -1) {
      // Unlike
      likes.splice(likeIndex, 1);
    } else {
      // Like
      likes.push(req.user.id);
    }

    comment.likes = likes;
    await comment.save();

    // Send notification for new like (not unlike) and not to self
    if (isLiking && comment.authorId.toString() !== req.user.id.toString()) {
      await Notification.create({
        userId: comment.authorId,
        type: 'forum_like',
        title: 'Someone liked your comment',
        message: `${req.user.name} liked your comment on "${comment.ForumPost?.title?.substring(0, 40)}${comment.ForumPost?.title?.length > 40 ? '...' : ''}"`,
        data: {
          commentId: comment.id,
          postId: comment.postId,
          postTitle: comment.ForumPost?.title,
          likerName: req.user.name,
          likerId: req.user.id
        },
        relatedId: comment.postId,
        link: `/forum/posts/${comment.postId}`
      });
      console.log(`📢 Comment like notification sent to ${comment.author?.name}`);
    }

    res.status(200).json({
      success: true,
      liked: isLiking,
      likesCount: likes.length,
      message: isLiking ? `You liked this comment (${likes.length} ${likes.length === 1 ? 'like' : 'likes'})` : `You unliked this comment (${likes.length} ${likes.length === 1 ? 'like' : 'likes'})`
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

// @desc    Create post in specific category
// @route   POST /api/forum/categories/:category/posts
// @access  Private
exports.createPostInCategory = async (req, res) => {
  try {
    const { ForumPost, User } = db.models;
    const { category } = req.params;
    const { title, content, type, tags, title_ar, content_ar, attachments } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const validCategories = ['mental-health', 'leadership', 'education-study', 'equality-rights', 'career-skills', 'womens-health'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const post = await ForumPost.create({
      title,
      content,
      title_ar: title_ar || null,
      content_ar: content_ar || null,
      type: type || 'discussion',
      category,
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

    const categoryNames = {
      'mental-health': 'Mental Health & Wellbeing',
      'leadership': 'Leadership & Empowerment', 
      'education-study': 'Education & Learning',
      'equality-rights': 'Equality, Equity & Rights',
      'career-skills': 'Career & Skills',
      'womens-health': "Women's Health"
    };

    // Send notification
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyNewForumQuestion(
      {
        id: post.id,
        title: title,
        category: categoryNames[category],
        author: {
          name: req.user.name
        }
      },
      req.user.id
    );

    const postData = post.toJSON();
    postData.categoryName = categoryNames[category];
    postData.publishedFrom = `Published from ${categoryNames[category]}`;

    res.status(201).json({
      success: true,
      post: postData
    });
  } catch (error) {
    console.error('Create post in category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get category statistics
// @route   GET /api/forum/categories/:category/stats
// @access  Public
exports.getCategoryStats = async (req, res) => {
  try {
    const { ForumPost, ForumComment } = db.models;
    const { category } = req.params;

    const validCategories = ['mental-health', 'leadership', 'education-study', 'equality-rights', 'career-skills', 'womens-health'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Get post counts by type
    const postStats = await ForumPost.findAll({
      where: { category },
      attributes: [
        'type',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Get total posts count
    const totalPosts = await ForumPost.count({
      where: { category }
    });

    // Get total comments count
    const totalComments = await ForumComment.count({
      include: [{
        model: ForumPost,
        where: { category },
        attributes: []
      }]
    });

    // Get recent activity (posts from last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentPosts = await ForumPost.count({
      where: {
        category,
        createdAt: {
          [Op.gte]: weekAgo
        }
      }
    });

    const categoryNames = {
      'mental-health': 'Mental Health & Wellbeing',
      'leadership': 'Leadership & Empowerment', 
      'education-study': 'Education & Learning',
      'equality-rights': 'Equality, Equity & Rights',
      'career-skills': 'Career & Skills',
      'womens-health': "Women's Health"
    };

    res.status(200).json({
      success: true,
      category,
      categoryName: categoryNames[category],
      stats: {
        totalPosts,
        totalComments,
        recentPosts,
        postsByType: postStats.reduce((acc, stat) => {
          acc[stat.type] = parseInt(stat.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
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
