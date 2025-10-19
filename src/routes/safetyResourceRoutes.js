const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getLegalAdvice,
  sendEmergencyAlert,
  getReportTypes,
  submitSafetyReport
} = require('../controllers/resourcesInfoController');

// Public routes - accessible without authentication
router.get('/legal-advice', getLegalAdvice);
router.get('/report-types', getReportTypes);
router.post('/report', submitSafetyReport);
router.post('/emergency-alert', sendEmergencyAlert);

// Protected route for user to view their reports
router.get('/my-reports', protect, async (req, res) => {
  try {
    const { Report } = require('../config/database').models;
    const reports = await Report.findAll({
      where: { reporterId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'type', 'description', 'status', 'urgencyLevel', 'createdAt', 'updatedAt']
    });
    
    res.json({ 
      success: true, 
      count: reports.length,
      reports 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports = router;
