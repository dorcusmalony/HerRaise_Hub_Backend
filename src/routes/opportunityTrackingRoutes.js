const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { models } = require('../config/database');

// Get user's opportunity applications with status
router.get('/my-applications', protect, async (req, res) => {
  try {
    const applications = await models.OpportunityApplication.findAll({
      where: { userId: req.user.id },
      include: [{
        model: models.Opportunity,
        attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark opportunity application as pending (reset)
router.post('/pending/:opportunityId', protect, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;

    let application = await models.OpportunityApplication.findOne({
      where: { userId, opportunityId }
    });

    if (!application) {
      application = await models.OpportunityApplication.create({
        userId,
        opportunityId,
        status: 'pending'
      });
    } else {
      await application.update({
        status: 'pending',
        completedAt: null
      });
    }

    res.json({
      success: true,
      message: 'Application marked as pending',
      status: 'pending',
      completedAt: null
    });
  } catch (error) {
    console.error('Pending application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark opportunity application as completed
router.post('/complete/:opportunityId', protect, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;

    let application = await models.OpportunityApplication.findOne({
      where: { userId, opportunityId }
    });

    const completedAt = new Date();
    
    if (!application) {
      application = await models.OpportunityApplication.create({
        userId,
        opportunityId,
        status: 'completed',
        completedAt
      });
    } else {
      await application.update({
        status: 'completed',
        completedAt
      });
    }

    res.json({
      success: true,
      message: 'Application marked as completed',
      status: 'completed',
      completedAt
    });
  } catch (error) {
    console.error('Complete application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get opportunities for side list view with application status
router.get('/opportunities-sidebar', protect, async (req, res) => {
  try {
    const opportunities = await models.Opportunity.findAll({
      where: { isActive: true },
      include: [{
        model: models.OpportunityApplication,
        where: { userId: req.user.id },
        required: false,
        attributes: ['status', 'completedAt']
      }],
      attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Transform for sidebar display
    const sidebarOpportunities = opportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      type: opp.type,
      organization: opp.organization,
      deadline: opp.applicationDeadline,
      status: opp.OpportunityApplications?.[0]?.status || 'not_applied',
      completedAt: opp.OpportunityApplications?.[0]?.completedAt
    }));

    res.json({
      success: true,
      opportunities: sidebarOpportunities
    });
  } catch (error) {
    console.error('Get sidebar opportunities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-track opportunity when clicked (replaces old dashboard tracking)
router.post('/track/:opportunityId', protect, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;

    const opportunity = await models.Opportunity.findByPk(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const [application] = await models.OpportunityApplication.findOrCreate({
      where: { userId, opportunityId },
      defaults: { status: 'pending' }
    });

    res.json({
      success: true,
      message: 'Opportunity added to sidebar',
      status: application.status
    });
  } catch (error) {
    console.error('Track opportunity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single opportunity with full details and status
router.get('/opportunity/:id', protect, async (req, res) => {
  try {
    const opportunity = await models.Opportunity.findOne({
      where: { id: req.params.id, isActive: true },
      include: [{
        model: models.OpportunityApplication,
        where: { userId: req.user.id },
        required: false,
        attributes: ['status', 'completedAt']
      }]
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const opportunityData = {
      ...opportunity.get({ plain: true }),
      applicationStatus: opportunity.OpportunityApplications?.[0]?.status || 'not_applied',
      completedAt: opportunity.OpportunityApplications?.[0]?.completedAt
    };

    res.json({
      success: true,
      opportunity: opportunityData
    });
  } catch (error) {
    console.error('Get opportunity details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;