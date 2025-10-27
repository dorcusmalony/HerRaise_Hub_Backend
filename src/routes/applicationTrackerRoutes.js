const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  trackApplication,
  getMyApplications,
  updateApplicationStatus,
  setReminder,
  getApplicationStats
} = require('../controllers/applicationTrackerController');

// All routes require authentication
router.use(protect);

// Track new application
router.post('/track', trackApplication);

// Get user's applications
router.get('/my-applications', getMyApplications);

// Get application statistics
router.get('/stats', getApplicationStats);

// Update application status
router.put('/:id/status', updateApplicationStatus);

// Set reminder
router.post('/:id/reminder', setReminder);

module.exports = router;