const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  trackClick,
  trackReturn,
  markInterested,
  getInterestedOpportunities,
  updateApplicationStatus,
  getApplicationDashboard,
  getClickedOpportunities,
  createTestRecord
} = require('../controllers/opportunityTrackingController');

// Simple test route (no auth required)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Tracking routes are working!', user: req.user ? req.user.name : 'No user' });
});

// Test POST route (no auth required)
router.post('/test-post', (req, res) => {
  res.json({ success: true, message: 'POST tracking routes working!' });
});

// Debug: Check if user has any tracking records
router.get('/debug', protect, async (req, res) => {
  try {
    const { OpportunityInteraction, Opportunity } = require('../config/database').models;
    const userId = req.user.id;
    
    const allInteractions = await OpportunityInteraction.findAll({
      where: { userId },
      raw: true
    });
    
    const firstOpportunity = await Opportunity.findOne({ raw: true });
    
    res.json({
      success: true,
      userId,
      totalInteractions: allInteractions.length,
      interactions: allInteractions,
      sampleOpportunity: firstOpportunity ? firstOpportunity.id : 'No opportunities found'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Force create a test tracking record
router.post('/force-track', protect, async (req, res) => {
  try {
    const { OpportunityInteraction, Opportunity } = require('../config/database').models;
    const userId = req.user.id;
    
    // Get first opportunity
    const opportunity = await Opportunity.findOne();
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'No opportunities found' });
    }
    
    // Force create tracking record
    const interaction = await OpportunityInteraction.create({
      userId,
      opportunityId: opportunity.id,
      isInterested: true,
      clickedAt: new Date(),
      statusUpdatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Test tracking record created',
      interaction,
      opportunityTitle: opportunity.title
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Automated track opportunity click (for card clicks)
router.post('/track/:opportunityId', protect, async (req, res) => {
  try {
    const { OpportunityInteraction, Opportunity } = require('../config/database').models;
    const { opportunityId } = req.params;
    const userId = req.user.id;
    
    const opportunity = await Opportunity.findByPk(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    // Automatically mark as liked/interested when user clicks
    const [interaction, created] = await OpportunityInteraction.findOrCreate({
      where: { userId, opportunityId },
      defaults: {
        isInterested: true,
        clickedAt: new Date(),
        statusUpdatedAt: new Date(),
        applicationStatus: 'interested'
      }
    });
    
    // If already exists but not marked as interested, update it
    if (!created && !interaction.isInterested) {
      interaction.isInterested = true;
      interaction.applicationStatus = 'interested';
      interaction.statusUpdatedAt = new Date();
      await interaction.save();
    }
    
    res.json({
      success: true,
      message: 'Opportunity automatically added to your liked opportunities',
      liked: true,
      created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// All routes below require authentication
router.use(protect);

// Get user's clicked/liked opportunities for dashboard
router.get('/clicked-opportunities', getClickedOpportunities);

// Track external link click
router.post('/click/:opportunityId', trackClick);

// Track user return (shows interest popup)
router.post('/return/:opportunityId', trackReturn);

// Mark as interested with reminder option
router.post('/interested/:opportunityId', markInterested);

// Get user's interested opportunities
router.get('/interested', getInterestedOpportunities);

// Update application status
router.put('/status/:opportunityId', updateApplicationStatus);

// Get application dashboard with stats
router.get('/dashboard', getApplicationDashboard);

// Create test tracking record
router.post('/create-test', createTestRecord);

module.exports = router;