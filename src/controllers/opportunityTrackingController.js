const db = require('../config/database');

// Track external link click
exports.trackClick = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;
    
    const { OpportunityInteraction, Opportunity } = db.models;
    
    // Get opportunity details
    const opportunity = await Opportunity.findByPk(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Create or update interaction
    const [interaction] = await OpportunityInteraction.findOrCreate({
      where: { userId, opportunityId },
      defaults: {
        clickedExternalLink: true,
        clickedAt: new Date()
      }
    });

    if (!interaction.clickedExternalLink) {
      interaction.clickedExternalLink = true;
      interaction.clickedAt = new Date();
      await interaction.save();
    }

    // Increment click count on opportunity
    opportunity.clickCount = (opportunity.clickCount || 0) + 1;
    await opportunity.save();

    res.json({
      success: true,
      redirectUrl: opportunity.applicationLink,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Track user return and show interest popup
exports.trackReturn = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;
    
    const { OpportunityInteraction, Opportunity } = db.models;
    
    const interaction = await OpportunityInteraction.findOne({
      where: { userId, opportunityId }
    });

    if (interaction && interaction.clickedExternalLink && !interaction.returnedAt) {
      interaction.returnedAt = new Date();
      await interaction.save();

      const opportunity = await Opportunity.findByPk(opportunityId);
      
      return res.json({
        success: true,
        showInterestPopup: true,
        opportunity: {
          id: opportunity.id,
          title: opportunity.title,
          type: opportunity.type,
          applicationDeadline: opportunity.applicationDeadline
        }
      });
    }

    res.json({ success: true, showInterestPopup: false });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as interested and set reminder
exports.markInterested = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { wantsReminder } = req.body;
    const userId = req.user.id;
    
    const { OpportunityInteraction } = db.models;
    
    const interaction = await OpportunityInteraction.findOne({
      where: { userId, opportunityId }
    });

    if (interaction) {
      interaction.isInterested = true;
      interaction.wantsReminder = wantsReminder || false;
      interaction.applicationStatus = 'interested';
      interaction.statusUpdatedAt = new Date();
      await interaction.save();
    }

    res.json({
      success: true,
      message: wantsReminder ? 
        'Great! We\'ll remind you 3 days before the deadline.' : 
        'Thanks for your interest!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's interested opportunities
exports.getInterestedOpportunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { OpportunityInteraction, Opportunity } = db.models;
    
    const interactions = await OpportunityInteraction.findAll({
      where: { 
        userId, 
        isInterested: true 
      },
      include: [{
        model: Opportunity,
        attributes: ['id', 'title', 'type', 'applicationDeadline', 'organization']
      }],
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      success: true,
      interestedOpportunities: interactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    
    const validStatuses = ['interested', 'in_progress', 'submitted', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const { OpportunityInteraction } = db.models;
    
    const interaction = await OpportunityInteraction.findOne({
      where: { userId, opportunityId }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity interaction not found'
      });
    }

    interaction.applicationStatus = status;
    interaction.statusUpdatedAt = new Date();
    if (notes) interaction.notes = notes;
    await interaction.save();

    res.json({
      success: true,
      message: `Application status updated to ${status}`,
      interaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's application dashboard
exports.getApplicationDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { OpportunityInteraction, Opportunity } = db.models;
    
    const interactions = await OpportunityInteraction.findAll({
      where: { 
        userId, 
        isInterested: true 
      },
      include: [{
        model: Opportunity,
        attributes: ['id', 'title', 'type', 'applicationDeadline', 'organization', 'applicationLink']
      }],
      order: [['updatedAt', 'DESC']]
    });

    // Group by status for dashboard stats
    const stats = {
      interested: 0,
      in_progress: 0,
      submitted: 0,
      accepted: 0,
      rejected: 0
    };

    interactions.forEach(interaction => {
      stats[interaction.applicationStatus]++;
    });

    res.json({
      success: true,
      applications: interactions,
      stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};