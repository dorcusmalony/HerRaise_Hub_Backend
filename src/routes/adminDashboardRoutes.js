const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { adminAuth } = require('../middleware/adminAuth');

// Dashboard stats endpoint
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { User, Opportunity, ForumPost, UserApplication, Report, Notification } = db.models;
    const { Op } = require('sequelize');

    // Get current date for time-based stats
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await Promise.all([
      // User stats
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
      User.count({ where: { createdAt: { [Op.gte]: startOfWeek } } }),
      User.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),

      // Opportunity stats
      Opportunity.count(),
      Opportunity.count({ where: { isActive: true } }),
      Opportunity.count({ where: { isFeatured: true } }),
      Opportunity.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),

      // Application stats
      UserApplication.count(),
      UserApplication.count({ where: { status: 'pending' } }),
      UserApplication.count({ where: { status: 'approved' } }),
      UserApplication.count({ where: { appliedAt: { [Op.gte]: startOfDay } } }),

      // Forum stats
      ForumPost.count(),
      ForumPost.count({ where: { isPinned: true } }),
      ForumPost.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),

      // Report stats
      Report.count(),
      Report.count({ where: { status: 'pending' } }),
      Report.count({ where: { status: 'resolved' } }),

      // Notification stats
      Notification.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: stats[0],
          active: stats[1],
          today: stats[2],
          thisWeek: stats[3],
          thisMonth: stats[4],
        },
        opportunities: {
          total: stats[5],
          active: stats[6],
          featured: stats[7],
          today: stats[8],
        },
        applications: {
          total: stats[9],
          pending: stats[10],
          approved: stats[11],
          today: stats[12],
        },
        forum: {
          totalPosts: stats[13],
          pinnedPosts: stats[14],
          todayPosts: stats[15],
        },
        reports: {
          total: stats[16],
          pending: stats[17],
          resolved: stats[18],
        },
        notifications: {
          today: stats[19],
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message,
    });
  }
});

// Recent activities
router.get('/recent-activities', adminAuth, async (req, res) => {
  try {
    const { UserActivity, User } = db.models;
    const limit = parseInt(req.query.limit) || 20;

    const activities = await UserActivity.findAll({
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message,
    });
  }
});

// System health check
router.get('/health', adminAuth, async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      health: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'System health check failed',
      error: error.message,
    });
  }
});

// Bulk operations
router.post('/bulk-actions', adminAuth, async (req, res) => {
  try {
    const { action, model, ids, data } = req.body;

    if (!action || !model || !ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk action parameters',
      });
    }

    const Model = db.models[model];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid model specified',
      });
    }

    let result;
    switch (action) {
      case 'delete':
        result = await Model.destroy({
          where: { id: ids },
        });
        break;
      case 'update':
        result = await Model.update(data, {
          where: { id: ids },
        });
        break;
      case 'activate':
        result = await Model.update({ isActive: true }, {
          where: { id: ids },
        });
        break;
      case 'deactivate':
        result = await Model.update({ isActive: false }, {
          where: { id: ids },
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action specified',
        });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      affected: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bulk action failed',
      error: error.message,
    });
  }
});

module.exports = router;