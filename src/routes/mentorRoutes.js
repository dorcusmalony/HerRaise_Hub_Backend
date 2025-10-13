const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const mentorController = require('../controllers/mentorController');

// Get all verified mentors (public)
router.get('/', mentorController.getMentors);

// Get available mentors for matching (protected)
router.get('/available', protect, mentorController.getAvailableMentors);

// Get mentor's mentees (mentor only)
router.get('/my-mentees', protect, authorize('mentor'), mentorController.getMentorMentees);

// Request a mentor (mentee only)
router.post('/request/:mentorId', protect, authorize('mentee'), mentorController.requestMentor);

// Update mentor profile (mentor only)
router.put('/profile', protect, authorize('mentor'), mentorController.updateMentorProfile);

// Verify a mentor (admin only)
router.put('/:id/verify', protect, authorize('admin'), mentorController.verifyMentor);

// Get specific mentor (public)
router.get('/:id', mentorController.getMentorById);

module.exports = router;
