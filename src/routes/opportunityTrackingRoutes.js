const express = require('express');
const router = express.Router();
const { User, Opportunity, OpportunityInterest } = require('../config/database');
const { protect: authMiddleware } = require('../middleware/auth');

// Track opportunity click
router.post('/track-click/:opportunityId', authMiddleware, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.id;

    // Check if already tracked
    let interest = await OpportunityInterest.findOne({
      where: { userId, opportunityId }
    });

    if (!interest) {
      interest = await OpportunityInterest.create({
        userId,
        opportunityId,
        clickedAt: new Date()
      });
    }

    res.json({ success: true, interestId: interest.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set user interest and reminder preference
router.post('/set-interest/:opportunityId', authMiddleware, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { isInterested, wantsReminder } = req.body;
    const userId = req.user.id;

    const [interest] = await OpportunityInterest.upsert({
      userId,
      opportunityId,
      isInterested,
      wantsReminder: isInterested ? wantsReminder : false
    });

    res.json({ success: true, interest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's tracked opportunities
router.get('/my-interests', authMiddleware, async (req, res) => {
  try {
    const interests = await OpportunityInterest.findAll({
      where: { userId: req.user.id },
      include: [Opportunity]
    });

    res.json(interests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;