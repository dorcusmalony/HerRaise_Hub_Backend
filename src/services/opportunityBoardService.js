const db = require('../config/database');
const { Op } = require('sequelize');

// Get opportunities with filters
const getOpportunities = async (filters) => {
  const { Opportunity, User } = db.models;
  const { type, location, deadline, featured, search, page = 1, limit = 12 } = filters;
  
  const where = { isActive: true };
  
  // Apply filters
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
    urgentDate.setDate(urgentDate.getDate() + 7);
    where.applicationDeadline = { 
      [Op.gte]: new Date(),
      [Op.lte]: urgentDate
    };
  }

  const offset = (page - 1) * limit;
  
  return await Opportunity.findAndCountAll({
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
};

// Track application click
const trackApplicationClick = async (opportunityId) => {
  const { Opportunity } = db.models;
  
  const opportunity = await Opportunity.findByPk(opportunityId);
  if (!opportunity) return null;

  opportunity.clickCount = (opportunity.clickCount || 0) + 1;
  await opportunity.save();
  
  return opportunity;
};

// Toggle bookmark
const toggleBookmark = async (opportunityId, userId) => {
  const { Opportunity } = db.models;
  
  const opportunity = await Opportunity.findByPk(opportunityId);
  if (!opportunity) return null;

  const interestedUsers = opportunity.interestedUsers || [];
  const userIndex = interestedUsers.indexOf(userId);

  if (userIndex > -1) {
    interestedUsers.splice(userIndex, 1);
  } else {
    interestedUsers.push(userId);
  }

  opportunity.interestedUsers = interestedUsers;
  await opportunity.save();

  return {
    opportunity,
    bookmarked: userIndex === -1,
    bookmarkCount: interestedUsers.length
  };
};

// Get bookmarked opportunities
const getBookmarkedOpportunities = async (userId) => {
  const { Opportunity, User } = db.models;

  return await Opportunity.findAll({
    where: {
      interestedUsers: { [Op.contains]: [userId] },
      isActive: true
    },
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'name']
    }],
    order: [['createdAt', 'DESC']]
  });
};

// Get opportunity statistics
const getOpportunityStats = async () => {
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

  return {
    total: stats[0],
    scholarships: stats[1],
    internships: stats[2],
    competitions: stats[3],
    activeDeadlines: stats[4]
  };
};

module.exports = {
  getOpportunities,
  trackApplicationClick,
  toggleBookmark,
  getBookmarkedOpportunities,
  getOpportunityStats
};