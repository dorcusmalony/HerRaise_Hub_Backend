const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getScholarships,
  createScholarship,
  applyForScholarship,
  getUserApplications,
  getNotifications,
  markNotificationRead
} = require('../controllers/scholarshipController');

// Scholarship routes
router.get('/', getScholarships);
router.post('/', protect, authorize('admin', 'mentor'), createScholarship);

// Application routes
router.post('/:scholarshipId/apply', protect, applyForScholarship);
router.get('/applications', protect, getUserApplications);

// Notification routes
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);

module.exports = router;