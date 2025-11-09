const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboardData, getQuickStats } = require('../controllers/dashboardController');
const { models } = require('../config/database');

// Dashboard routes (all protected)
router.get('/', protect, getDashboardData);
router.get('/stats', protect, getQuickStats);

// Redirect old tracking to new system
router.post('/track-opportunity/:opportunityId', protect, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;

    const [application] = await models.OpportunityApplication.findOrCreate({
      where: { userId, opportunityId },
      defaults: { status: 'pending' }
    });

    res.json({
      success: true,
      message: 'Opportunity added to sidebar',
      liked: true,
      created: true
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;