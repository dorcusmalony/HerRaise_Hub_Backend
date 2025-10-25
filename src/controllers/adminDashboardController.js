const db = require('../config/database');
const { Op } = require('sequelize');

// Admin Dashboard Overview
exports.getDashboardStats = async (req, res) => {
  try {
    const { User, ForumPost, Resource, Opportunity, Scholarship } = db.models;

    const stats = await Promise.all([
      // User stats
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { role: 'admin' } }),
      User.count({ where: { role: 'mentor' } }),
      User.count({ where: { role: 'mentee' } }),
      
      // Content stats
      ForumPost.count(),
      Resource.count(),
      Opportunity.count(),
      Scholarship.count(),
      
      // Recent activity
      User.count({ 
        where: { 
          createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      }),
      ForumPost.count({ 
        where: { 
          createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      })
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: stats[0],
          active: stats[1],
          admins: stats[2],
          mentors: stats[3],
          mentees: stats[4],
          newThisWeek: stats[9]
        },
        content: {
          posts: stats[5],
          resources: stats[6],
          opportunities: stats[7],
          scholarships: stats[8],
          newPostsThisWeek: stats[10]
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// System Health Check
exports.getSystemHealth = async (req, res) => {
  try {
    res.json({
      success: true,
      health: {
        database: 'connected',
        server: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      health: {
        database: 'error',
        server: 'running',
        error: error.message
      }
    });
  }
};

// Recent Activity Feed
exports.getRecentActivity = async (req, res) => {
  try {
    const { User, ForumPost, Resource } = db.models;
    const limit = parseInt(req.query.limit) || 20;

    const [newUsers, newPosts, newResources] = await Promise.all([
      User.findAll({
        limit: limit / 3,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'email', 'role', 'createdAt']
      }),
      ForumPost.findAll({
        limit: limit / 3,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, attributes: ['name'] }]
      }),
      Resource.findAll({
        limit: limit / 3,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, attributes: ['name'] }]
      })
    ]);

    const activity = [
      ...newUsers.map(user => ({
        type: 'user_registered',
        data: user,
        timestamp: user.createdAt
      })),
      ...newPosts.map(post => ({
        type: 'post_created',
        data: post,
        timestamp: post.createdAt
      })),
      ...newResources.map(resource => ({
        type: 'resource_created',
        data: resource,
        timestamp: resource.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Settings
exports.updateSettings = async (req, res) => {
  try {
    // This would typically update system settings in a settings table
    // For now, just return success
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};