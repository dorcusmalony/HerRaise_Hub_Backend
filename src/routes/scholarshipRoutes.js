const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Remove authorize
const adminJwt = require('../middleware/adminJwt'); // Add this line
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
router.post('/', adminJwt, createScholarship);

// Application routes
router.post('/:scholarshipId/apply', protect, applyForScholarship);
router.get('/applications', protect, getUserApplications);

// Notification routes
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);

module.exports = router;