const express = require('express');
const router = express.Router();
const { getLandingData, getStats } = require('../controllers/landingController');

// Landing page routes
router.get('/', getLandingData);
router.get('/stats', getStats);

module.exports = router;