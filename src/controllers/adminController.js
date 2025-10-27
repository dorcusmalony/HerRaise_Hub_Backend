const db = require('../config/database');
const { Op } = require('sequelize');

// Admin Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { User, ForumPost, Opportunity, UserApplication, Notification } = db.models;

    const stats = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      ForumPost.count(),
      Opportunity.count(),
      UserApplication.count(),
      Notification.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: stats[0],
        activeUsers: stats[1],
        totalPosts: stats[2],
        totalOpportunities: stats[3],
        totalApplications: stats[4],
        todayNotifications: stats[5]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { User } = db.models;
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const offset = (page - 1) * limit;
    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { User } = db.models;
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: { ...user.toJSON(), password: undefined }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { User } = db.models;
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Forum Management
exports.getAllPosts = async (req, res) => {
  try {
    const { ForumPost, User, ForumComment } = db.models;
    const { page = 1, limit = 20, search, type } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (type) where.type = type;

    const offset = (page - 1) * limit;
    const { rows: posts, count } = await ForumPost.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
        { model: ForumComment, attributes: ['id'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedPosts = posts.map(post => ({
      ...post.toJSON(),
      likesCount: (post.likes || []).length,
      commentsCount: (post.ForumComments || []).length,
      viewsCount: post.views || 0
    }));

    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { ForumPost } = db.models;
    const { id } = req.params;
    const { title, content, type, isPinned, isLocked } = req.body;

    const post = await ForumPost.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (type) post.type = type;
    if (typeof isPinned === 'boolean') post.isPinned = isPinned;
    if (typeof isLocked === 'boolean') post.isLocked = isLocked;

    await post.save();

    res.json({
      success: true,
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { ForumPost } = db.models;
    const { id } = req.params;

    const post = await ForumPost.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.destroy();

    res.json({
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

// Opportunity Management
exports.createOpportunity = async (req, res) => {
  try {
    const { Opportunity } = db.models;
    const {
      title, description, organization, type, location,
      applicationLink, applicationDeadline, amount,
      eligibility, requirements, isFeatured
    } = req.body;

    const opportunity = await Opportunity.create({
      title,
      description,
      organization,
      type,
      location,
      applicationLink,
      applicationDeadline,
      amount,
      eligibility,
      requirements: Array.isArray(requirements) ? requirements : [],
      isFeatured: isFeatured || false,
      isActive: true,
      createdBy: req.user.id
    });

    // Send notification to all users
    const { sendNewOpportunityNotification } = require('../services/applicationReminderService');
    await sendNewOpportunityNotification(opportunity);

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      opportunity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateOpportunity = async (req, res) => {
  try {
    const { Opportunity } = db.models;
    const { id } = req.params;

    const opportunity = await Opportunity.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const {
      title, description, organization, type, location,
      applicationLink, applicationDeadline, amount,
      eligibility, requirements, isFeatured, isActive
    } = req.body;

    if (title) opportunity.title = title;
    if (description) opportunity.description = description;
    if (organization) opportunity.organization = organization;
    if (type) opportunity.type = type;
    if (location) opportunity.location = location;
    if (applicationLink) opportunity.applicationLink = applicationLink;
    if (applicationDeadline) opportunity.applicationDeadline = applicationDeadline;
    if (amount) opportunity.amount = amount;
    if (eligibility) opportunity.eligibility = eligibility;
    if (requirements) opportunity.requirements = Array.isArray(requirements) ? requirements : [];
    if (typeof isFeatured === 'boolean') opportunity.isFeatured = isFeatured;
    if (typeof isActive === 'boolean') opportunity.isActive = isActive;

    await opportunity.save();

    res.json({
      success: true,
      message: 'Opportunity updated successfully',
      opportunity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteOpportunity = async (req, res) => {
  try {
    const { Opportunity } = db.models;
    const { id } = req.params;

    const opportunity = await Opportunity.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    await opportunity.destroy();

    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDashboardStats: exports.getDashboardStats,
  getAllUsers: exports.getAllUsers,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  getAllPosts: exports.getAllPosts,
  updatePost: exports.updatePost,
  deletePost: exports.deletePost,
  createOpportunity: exports.createOpportunity,
  updateOpportunity: exports.updateOpportunity,
  deleteOpportunity: exports.deleteOpportunity
};