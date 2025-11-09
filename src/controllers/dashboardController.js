const db = require('../config/database');

// @desc    Get dashboard data for logged-in user
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
  try {
    const { Opportunity, Application, ForumPost, Notification, OpportunityInteraction } = db.models;
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

    // Get user's clicked/liked opportunities (filter out old ones)
    let clickedOpportunities = [];
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      clickedOpportunities = await OpportunityInteraction.findAll({
        where: { 
          userId,
          createdAt: {
            [db.Sequelize.Op.gte]: thirtyDaysAgo
          }
        },
        include: [{
          model: Opportunity,
          attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline', 'description'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 8
      });
    } catch (trackingError) {
      console.log('Tracking query failed:', trackingError.message);
      // Continue without tracking data
    }

    // Get recommended opportunities (active ones user hasn't applied to)
    const appliedOpportunityIds = userApplications.map(app => app.opportunityId);
    const clickedOpportunityIds = clickedOpportunities.map(interaction => interaction.opportunityId);
    const excludeIds = [...appliedOpportunityIds, ...clickedOpportunityIds];
    
    const recommendedOpportunities = await Opportunity.findAll({
      where: { 
        isActive: true,
        ...(excludeIds.length > 0 ? { id: { [db.Sequelize.Op.notIn]: excludeIds } } : {})
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
      clickedOpportunities: clickedOpportunities.length,
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
        clickedOpportunities: clickedOpportunities.map(interaction => ({
          ...interaction.toJSON(),
          opportunity: interaction.Opportunity
        })),
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
    const { Application, ForumPost, Notification, OpportunityInteraction } = db.models;
    const userId = req.user.id;

    const [applications, posts, notifications, clickedOpportunities] = await Promise.all([
      Application.count({ where: { userId } }),
      ForumPost.count({ where: { authorId: userId } }),
      Notification.count({ where: { userId, readStatus: false } }),
      OpportunityInteraction.count({ where: { userId } })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        applications,
        posts,
        unreadNotifications: notifications,
        clickedOpportunities
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

