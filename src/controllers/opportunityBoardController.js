const db = require('../config/database');
const { Op } = require('sequelize');
const { addCountdownToOpportunities, getUrgentOpportunities } = require('../services/countdownService');

// Get all opportunities with filters
exports.getOpportunities = async (req, res) => {
  try {
    const { 
      type, 
      location, 
      deadline = 'all', 
      featured = false,
      search,
      page = 1,
      limit = 12
    } = req.query;

    const { Opportunity, User } = db.models;
    const where = { isActive: true };
    
    // Filters
    if (type && type !== 'all') where.type = type;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (featured === 'true') where.isFeatured = true;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { organization: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Deadline filter
    if (deadline === 'active') {
      where.applicationDeadline = { [Op.gte]: new Date() };
    } else if (deadline === 'urgent') {
      const urgentDate = new Date();
      urgentDate.setDate(urgentDate.getDate() + 7); // Next 7 days
      where.applicationDeadline = { 
        [Op.gte]: new Date(),
        [Op.lte]: urgentDate
      };
    }

    const offset = (page - 1) * limit;
    
    const { rows: opportunities, count } = await Opportunity.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name']
      }],
      order: [
        ['isFeatured', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add countdown information to opportunities
    const opportunitiesWithCountdown = addCountdownToOpportunities(opportunities);

    res.json({
      success: true,
      message: req.t('messages.success'),
      opportunities: opportunitiesWithCountdown,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page * limit < count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: req.t('messages.error')
    });
  }
};

// Track external application click
exports.trackApplicationClick = async (req, res) => {
  try {
    const { id } = req.params;
    const { Opportunity } = db.models;

    const opportunity = await Opportunity.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: req.t('opportunities.notFound')
      });
    }

    // Increment click count
    opportunity.clickCount = (opportunity.clickCount || 0) + 1;
    await opportunity.save();

    res.json({
      success: true,
      applicationLink: opportunity.applicationLink,
      message: req.t('opportunities.clickTracked')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: req.t('messages.error')
    });
  }
};

// Bookmark/Save opportunity
exports.toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const { Opportunity, OpportunityApplication } = db.models;

    const opportunity = await Opportunity.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: req.t('opportunities.notFound')
      });
    }

    const interestedUsers = opportunity.interestedUsers || [];
    const userIndex = interestedUsers.indexOf(req.user.id);

    if (userIndex > -1) {
      // Remove bookmark
      interestedUsers.splice(userIndex, 1);
      
      // Remove from tracking system
      if (OpportunityApplication) {
        await OpportunityApplication.destroy({
          where: { userId: req.user.id, opportunityId: id }
        });
      }
    } else {
      // Add bookmark
      interestedUsers.push(req.user.id);
      
      // Add to tracking system
      if (OpportunityApplication) {
        await OpportunityApplication.findOrCreate({
          where: { userId: req.user.id, opportunityId: id },
          defaults: { status: 'pending' }
        });
      }
      
      console.log(`📝 Opportunity ${id} bookmarked and tracked for user ${req.user.id}`);
    }

    opportunity.interestedUsers = interestedUsers;
    await opportunity.save();

    res.json({
      success: true,
      bookmarked: userIndex === -1,
      bookmarkCount: interestedUsers.length,
      message: userIndex === -1 ? req.t('opportunities.bookmarked') : req.t('opportunities.unbookmarked')
    });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(500).json({
      success: false,
      message: req.t('messages.error')
    });
  }
};

// Get user's bookmarked opportunities
exports.getBookmarkedOpportunities = async (req, res) => {
  try {
    const { Opportunity, User } = db.models;

    const opportunities = await Opportunity.findAll({
      where: {
        interestedUsers: { [Op.contains]: [req.user.id] },
        isActive: true
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      message: req.t('messages.success'),
      opportunities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: req.t('messages.error')
    });
  }
};

// Get opportunity statistics
exports.getOpportunityStats = async (req, res) => {
  try {
    const { Opportunity } = db.models;

    const stats = await Promise.all([
      Opportunity.count({ where: { isActive: true } }),
      Opportunity.count({ where: { type: 'scholarship', isActive: true } }),
      Opportunity.count({ where: { type: 'internship', isActive: true } }),
      Opportunity.count({ where: { type: 'competition', isActive: true } }),
      Opportunity.count({ 
        where: { 
          applicationDeadline: { [Op.gte]: new Date() },
          isActive: true 
        } 
      })
    ]);

    res.json({
      success: true,
      message: req.t('messages.success'),
      stats: {
        total: stats[0],
        scholarships: stats[1],
        internships: stats[2],
        competitions: stats[3],
        activeDeadlines: stats[4]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: req.t('messages.error')
    });
  }
};

// Get urgent opportunities with countdown
exports.getUrgentOpportunities = async (req, res) => {
  try {
    const urgentOpportunities = await getUrgentOpportunities();
    
    res.json({
      success: true,
      message: req.t('messages.success'),
      opportunities: urgentOpportunities,
      count: urgentOpportunities.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: req.t('messages.error')
    });
  }
};

module.exports = {
  getOpportunities: exports.getOpportunities,
  trackApplicationClick: exports.trackApplicationClick,
  toggleBookmark: exports.toggleBookmark,
  getBookmarkedOpportunities: exports.getBookmarkedOpportunities,
  getOpportunityStats: exports.getOpportunityStats,
  getUrgentOpportunities: exports.getUrgentOpportunities
};