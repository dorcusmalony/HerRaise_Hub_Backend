const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboardData, getQuickStats, trackOpportunity } = require('../controllers/dashboardController');

// Dashboard routes (all protected)
router.get('/', protect, getDashboardData);
router.get('/stats', protect, getQuickStats);
router.post('/track-opportunity/:opportunityId', protect, trackOpportunity);

module.exports = router;