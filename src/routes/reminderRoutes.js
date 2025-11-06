const express = require('express');
const { getPendingOpportunities, markOpportunityCompleted } = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/pending-opportunities', protect, getPendingOpportunities);
router.put('/mark-completed/:opportunityId', protect, markOpportunityCompleted);

module.exports = router;