const db = require('../config/database');
const { Op } = require('sequelize');

// @desc    Get pending opportunities with approaching deadlines
// @route   GET /api/reminders/pending-opportunities
// @access  Private
exports.getPendingOpportunities = async (req, res) => {
  try {
    const { OpportunityInteraction, Opportunity } = db.models;
    const userId = req.user.id;
    
    // Get current date and 7 days from now
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    // Find liked opportunities that haven't been applied to and have deadlines within 7 days
    const pendingOpportunities = await OpportunityInteraction.findAll({
      where: {
        userId,
        isInterested: true,
        applicationStatus: 'interested' // Only interested, not applied
      },
      include: [{
        model: Opportunity,
        where: {
          applicationDeadline: {
            [Op.between]: [now, sevenDaysFromNow]
          },
          isActive: true
        },
        attributes: ['id', 'title', 'organization', 'applicationDeadline', 'type']
      }],
      order: [[Opportunity, 'applicationDeadline', 'ASC']]
    });
    
    // Calculate days remaining for each opportunity
    const opportunitiesWithDays = pendingOpportunities.map(interaction => {
      const deadline = new Date(interaction.Opportunity.applicationDeadline);
      const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      return {
        id: interaction.Opportunity.id,
        title: interaction.Opportunity.title,
        organization: interaction.Opportunity.organization,
        type: interaction.Opportunity.type,
        applicationDeadline: interaction.Opportunity.applicationDeadline,
        daysRemaining,
        isUrgent: daysRemaining <= 3
      };
    });
    
    res.json({
      success: true,
      count: opportunitiesWithDays.length,
      opportunities: opportunitiesWithDays
    });
  } catch (error) {
    console.error('Get pending opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending opportunities'
    });
  }
};

// @desc    Mark opportunity as completed/applied
// @route   PUT /api/reminders/mark-completed/:opportunityId
// @access  Private
exports.markOpportunityCompleted = async (req, res) => {
  try {
    const { OpportunityInteraction } = db.models;
    const { opportunityId } = req.params;
    const userId = req.user.id;
    
    const interaction = await OpportunityInteraction.findOne({
      where: { userId, opportunityId }
    });
    
    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity interaction not found'
      });
    }
    
    // Update status to submitted to stop reminders
    interaction.applicationStatus = 'submitted';
    interaction.statusUpdatedAt = new Date();
    await interaction.save();
    
    res.json({
      success: true,
      message: 'Opportunity marked as completed'
    });
  } catch (error) {
    console.error('Mark opportunity completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark opportunity as completed'
    });
  }
};