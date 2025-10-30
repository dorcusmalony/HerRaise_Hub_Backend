const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  trackClick,
  trackReturn,
  markInterested,
  getInterestedOpportunities,
  updateApplicationStatus,
  getApplicationDashboard
} = require('../controllers/opportunityTrackingController');

// Track external link click
router.post('/:opportunityId/track-click', protect, trackClick);

// Track user return
router.post('/:opportunityId/track-return', protect, trackReturn);

// Mark as interested
router.post('/:opportunityId/interested', protect, markInterested);

// Get interested opportunities
router.get('/interested', protect, getInterestedOpportunities);

// Update application status
router.put('/:opportunityId/status', protect, updateApplicationStatus);

// Get application dashboard
router.get('/dashboard', protect, getApplicationDashboard);

module.exports = router;