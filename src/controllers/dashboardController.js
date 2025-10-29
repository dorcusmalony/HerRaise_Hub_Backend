const db = require('../config/database');

// @desc    Get dashboard data for logged-in user
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
  try {
    const { Opportunity, Application, ForumPost, Notification } = db.models;
    const userId = req.user.id;

    // Get user's applications
    const userApplications = await Application.findAll({
      where: { userId },
      include: [{
        model: Opportunity,
        attributes: ['title', 'type', 'organization', 'applicationDeadline']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get recommended opportunities (active ones user hasn't applied to)
    const appliedOpportunityIds = userApplications.map(app => app.opportunityId);
    const recommendedOpportunities = await Opportunity.findAll({
      where: { 
        isActive: true,
        ...(appliedOpportunityIds.length > 0 ? { id: { [db.Sequelize.Op.notIn]: appliedOpportunityIds } } : {})
      },
      order: [['createdAt', 'DESC']],
      limit: 6,
      attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline', 'description']
    });

    // Get user's recent forum posts
    const userPosts = await ForumPost.findAll({
      where: { authorId: userId },
      order: [['createdAt', 'DESC']],
      limit: 3,
      attributes: ['id', 'title', 'type', 'createdAt', 'views', 'likes']
    });

    // Get unread notifications
    const unreadNotifications = await Notification.findAll({
      where: { 
        userId,
        readStatus: false
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Calculate user stats
    const stats = {
      totalApplications: userApplications.length,
      pendingApplications: userApplications.filter(app => app.status === 'submitted' || app.status === 'under_review').length,
      acceptedApplications: userApplications.filter(app => app.status === 'accepted').length,
      forumPosts: userPosts.length,
      unreadNotifications: unreadNotifications.length
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          role: req.user.role,
          profilePicture: req.user.profilePicture
        },
        stats,
        recentApplications: userApplications,
        recommendedOpportunities,
        recentPosts: userPosts,
        notifications: unreadNotifications
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
};

// @desc    Get quick stats for dashboard
// @route   GET /api/dashboard/stats
// @access  Private
exports.getQuickStats = async (req, res) => {
  try {
    const { Application, ForumPost, Notification } = db.models;
    const userId = req.user.id;

    const [applications, posts, notifications] = await Promise.all([
      Application.count({ where: { userId } }),
      ForumPost.count({ where: { authorId: userId } }),
      Notification.count({ where: { userId, readStatus: false } })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        applications,
        posts,
        unreadNotifications: notifications
      }
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load stats'
    });
  }
};