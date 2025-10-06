const express = require('express');
const router = express.Router();
const {
  getMyActivity,
  getActivityStats,
  checkAndAwardBadges,
  getLeaderboard
} = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.get('/me', protect, getMyActivity);
router.get('/stats', protect, getActivityStats);
router.post('/check-badges', protect, checkAndAwardBadges);
router.get('/leaderboard', getLeaderboard);

module.exports = router;