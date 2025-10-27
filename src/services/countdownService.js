const db = require('../config/database');
const { Op } = require('sequelize');

// Calculate days left for deadline
const calculateDaysLeft = (deadline) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get countdown status and urgency level
const getCountdownStatus = (daysLeft) => {
  if (daysLeft < 0) return { status: 'expired', urgency: 'expired', color: '#dc3545' };
  if (daysLeft === 0) return { status: 'today', urgency: 'critical', color: '#dc3545' };
  if (daysLeft === 1) return { status: '1 day left', urgency: 'critical', color: '#dc3545' };
  if (daysLeft <= 3) return { status: `${daysLeft} days left`, urgency: 'high', color: '#fd7e14' };
  if (daysLeft <= 7) return { status: `${daysLeft} days left`, urgency: 'medium', color: '#ffc107' };
  if (daysLeft <= 30) return { status: `${daysLeft} days left`, urgency: 'low', color: '#28a745' };
  return { status: `${daysLeft} days left`, urgency: 'normal', color: '#6c757d' };
};

// Add countdown info to opportunities
const addCountdownToOpportunities = (opportunities) => {
  return opportunities.map(opportunity => {
    const daysLeft = calculateDaysLeft(opportunity.applicationDeadline);
    const countdown = getCountdownStatus(daysLeft);
    
    return {
      ...opportunity.toJSON ? opportunity.toJSON() : opportunity,
      countdown: {
        daysLeft,
        ...countdown,
        isUrgent: countdown.urgency === 'critical' || countdown.urgency === 'high',
        isExpired: countdown.urgency === 'expired'
      }
    };
  });
};

// Get urgent opportunities (deadline within 7 days)
const getUrgentOpportunities = async () => {
  const { Opportunity } = db.models;
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const opportunities = await Opportunity.findAll({
    where: {
      applicationDeadline: {
        [Op.between]: [new Date(), sevenDaysFromNow]
      },
      isActive: true
    },
    order: [['applicationDeadline', 'ASC']]
  });

  return addCountdownToOpportunities(opportunities);
};

// Get expiring soon opportunities for notifications
const getExpiringOpportunities = async (days = 3) => {
  const { Opportunity } = db.models;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);

  const opportunities = await Opportunity.findAll({
    where: {
      applicationDeadline: {
        [Op.between]: [new Date(), targetDate]
      },
      isActive: true
    }
  });

  return addCountdownToOpportunities(opportunities);
};

module.exports = {
  calculateDaysLeft,
  getCountdownStatus,
  addCountdownToOpportunities,
  getUrgentOpportunities,
  getExpiringOpportunities
};