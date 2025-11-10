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
    const applications = await models.OpportunityApplication.findAll({
      where: { userId: req.user.id },
      include: [{
        model: models.Opportunity,
        where: { isActive: true },
        attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Transform for sidebar display - only show tracked opportunities
    const sidebarOpportunities = applications.map(app => ({
      id: app.Opportunity.id,
      title: app.Opportunity.title,
      type: app.Opportunity.type,
      organization: app.Opportunity.organization,
      deadline: app.Opportunity.applicationDeadline,
      status: app.status,
      completedAt: app.completedAt
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

// Get clicked opportunities (for frontend compatibility)
router.get('/clicked-opportunities', protect, async (req, res) => {
  try {
    console.log('Fetching clicked opportunities for user:', req.user.id);
    
    const applications = await models.OpportunityApplication.findAll({
      where: { userId: req.user.id },
      include: [{
        model: models.Opportunity,
        attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline', 'description'],
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log('Found applications:', applications.length);

    const clickedOpportunities = applications.map(app => ({
      id: app.id,
      opportunityId: app.opportunityId,
      opportunity: app.Opportunity,
      createdAt: app.createdAt
    }));

    res.json({
      success: true,
      opportunities: clickedOpportunities,
      clickedOpportunities
    });
  } catch (error) {
    console.error('Clicked opportunities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete application (for frontend compatibility)
router.post('/complete-application', protect, async (req, res) => {
  try {
    const { opportunityId, completed } = req.body;
    const userId = req.user.id;

    let application = await models.OpportunityApplication.findOne({
      where: { userId, opportunityId }
    });

    if (!application) {
      application = await models.OpportunityApplication.create({
        userId,
        opportunityId,
        status: completed ? 'completed' : 'pending',
        completedAt: completed ? new Date() : null
      });
    } else {
      await application.update({
        status: completed ? 'completed' : 'pending',
        completedAt: completed ? new Date() : null
      });
    }

    res.json({
      success: true,
      message: completed ? 'Application marked as completed' : 'Application marked as pending'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check for pending opportunities on login
router.get('/pending-check', protect, async (req, res) => {
  try {
    const pendingApplications = await models.OpportunityApplication.findAll({
      where: { 
        userId: req.user.id,
        status: 'pending'
      },
      include: [{
        model: models.Opportunity,
        attributes: ['id', 'title', 'type', 'organization']
      }]
    });

    res.json({
      success: true,
      hasPending: pendingApplications.length > 0,
      count: pendingApplications.length,
      opportunities: pendingApplications.map(app => ({
        id: app.id,
        opportunityId: app.opportunityId,
        title: app.Opportunity.title,
        type: app.Opportunity.type,
        organization: app.Opportunity.organization
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk update pending opportunities to completed
router.post('/complete-pending', protect, async (req, res) => {
  try {
    const { completed } = req.body; // true/false from user answer
    
    if (completed) {
      await models.OpportunityApplication.update(
        { 
          status: 'completed',
          completedAt: new Date()
        },
        { 
          where: { 
            userId: req.user.id,
            status: 'pending'
          }
        }
      );
      
      res.json({
        success: true,
        message: 'All pending opportunities marked as completed'
      });
    } else {
      res.json({
        success: true,
        message: 'Opportunities remain pending'
      });
    }
  } catch (error) {
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