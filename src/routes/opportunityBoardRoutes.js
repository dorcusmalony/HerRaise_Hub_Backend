const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOpportunities,
  trackApplicationClick,
  toggleBookmark,
  getBookmarkedOpportunities,
  getOpportunityStats,
  getUrgentOpportunities
} = require('../controllers/opportunityBoardController');

// Public routes
router.get('/', getOpportunities);
router.get('/stats', getOpportunityStats);
router.get('/urgent', getUrgentOpportunities);

// Protected routes
router.post('/:id/apply', protect, trackApplicationClick);
router.post('/:id/bookmark', protect, toggleBookmark);
router.get('/bookmarked', protect, getBookmarkedOpportunities);

module.exports = router;