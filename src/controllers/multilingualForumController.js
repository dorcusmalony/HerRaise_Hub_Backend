const db = require('../config/database');
const { localizeResponse } = require('../utils/responseLocalizer');
const { getTextDirection } = require('../utils/textDirection');

// @desc    Get forum posts with language filtering
// @route   GET /api/forum/posts
// @access  Public
exports.getPostsMultilingual = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    const { filter = 'all', sort = 'recent', limit = 10, category } = req.query;
    const lang = req.language || 'en';

    const where = {
      type: ['discussion', 'question', 'announcement'],
      [db.Sequelize.Op.or]: [
        { language: lang },
        { language: null }
      ]
    };

    if (filter !== 'all' && ['discussion', 'question', 'announcement'].includes(filter)) {
      where.type = filter;
    }
    if (category && ['personal-growth', 'mental-health', 'education-study', 'career-future'].includes(category)) {
      where.category = category;
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
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'profilePicture', 'role']
          }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    const formattedPosts = posts.map(post => {
      const postData = post.toJSON();
      return {
        ...postData,
        likesCount: (postData.likes || []).length,
        commentsCount: (postData.ForumComments || []).length,
        viewsCount: postData.views || 0,
        attachmentsCount: (postData.attachments || []).length
      };
    });

    const response = localizeResponse({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts,
      language: lang,
      direction: getTextDirection(lang),
      messageKey: 'success'
    }, lang);

    res.status(200).json(response);
  } catch (error) {
    const response = localizeResponse({
      success: false,
      message: error.message,
      messageKey: 'error'
    }, req.language || 'en');
    
    res.status(500).json(response);
  }
};

// @desc    Create multilingual forum post
// @route   POST /api/forum/posts
// @access  Private
exports.createPostMultilingual = async (req, res) => {
  try {
    const { ForumPost, User } = db.models;
    const { title, content, type, tags, title_ar, content_ar, attachments, category } = req.body;
    const lang = req.language || 'en';

    const validCategories = ['personal-growth', 'mental-health', 'education-study', 'career-future'];
    if (category && !validCategories.includes(category)) {
      const response = localizeResponse({
        success: false,
        message: 'Invalid category',
        messageKey: 'error'
      }, lang);
      return res.status(400).json(response);
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
      language: lang,
      authorId: req.user.id
    });

    await post.reload({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'profilePicture', 'role']
      }]
    });

    const response = localizeResponse({
      success: true,
      post,
      messageKey: 'created'
    }, lang);

    res.status(201).json(response);
  } catch (error) {
    const response = localizeResponse({
      success: false,
      message: error.message,
      messageKey: 'error'
    }, req.language || 'en');
    
    res.status(500).json(response);
  }
};

module.exports = {
  getPostsMultilingual,
  createPostMultilingual
};