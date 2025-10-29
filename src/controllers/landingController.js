const db = require('../config/database');

// @desc    Get landing page data
// @route   GET /api/landing
// @access  Public
exports.getLandingData = async (req, res) => {
  try {
    const { User, Opportunity, ForumPost } = db.models;

    // Get basic stats for landing page
    const [userCount, opportunityCount, forumPostCount] = await Promise.all([
      User.count(),
      Opportunity.count({ where: { isActive: true } }),
      ForumPost.count()
    ]);

    // Get featured opportunities (latest 3)
    const featuredOpportunities = await Opportunity.findAll({
      where: { isActive: true, isFeatured: true },
      order: [['createdAt', 'DESC']],
      limit: 3,
      attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline', 'description']
    });

    // Get recent forum discussions (latest 3)
    const recentDiscussions = await ForumPost.findAll({
      order: [['createdAt', 'DESC']],
      limit: 3,
      include: [{
        model: User,
        as: 'author',
        attributes: ['name', 'role']
      }],
      attributes: ['id', 'title', 'type', 'createdAt', 'views']
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: userCount,
          activeOpportunities: opportunityCount,
          forumPosts: forumPostCount
        },
        featuredOpportunities,
        recentDiscussions,
        features: [
          {
            title: 'Scholarship Opportunities',
            description: 'Access exclusive scholarships and funding opportunities for women in South Sudan',
            icon: '🎓'
          },
          {
            title: 'Mentorship Network',
            description: 'Connect with experienced mentors who can guide your career journey',
            icon: '👩🏫'
          },
          {
            title: 'Community Forum',
            description: 'Join discussions, share experiences, and support other women',
            icon: '💬'
          },
          {
            title: 'Safety Resources',
            description: 'Access safety tools and confidential reporting for your protection',
            icon: '🛡️'
          },
          {
            title: 'Career Development',
            description: 'Find internships, jobs, and professional development opportunities',
            icon: '📈'
          },
          {
            title: 'Educational Resources',
            description: 'Access learning materials and skill development resources',
            icon: '📚'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Landing page error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load landing page data'
    });
  }
};

// @desc    Get platform statistics
// @route   GET /api/landing/stats
// @access  Public
exports.getStats = async (req, res) => {
  try {
    const { User, Opportunity, ForumPost, Application } = db.models;

    const stats = await Promise.all([
      User.count(),
      User.count({ where: { role: 'mentor' } }),
      Opportunity.count({ where: { isActive: true } }),
      ForumPost.count(),
      Application.count({ where: { status: 'accepted' } })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: stats[0],
        mentors: stats[1],
        opportunities: stats[2],
        discussions: stats[3],
        successfulApplications: stats[4]
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load statistics'
    });
  }
};