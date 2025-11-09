const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboardData, getQuickStats } = require('../controllers/dashboardController');

// Dashboard routes (all protected)
router.get('/', protect, getDashboardData);
router.get('/stats', protect, getQuickStats);

module.exports = router;