const express = require('express');
const router = express.Router();
const {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  applyToOpportunity,
  getMyApplications,
  getApplication,
  updateApplicationStatus
} = require('../controllers/opportunityController');
const { protect, authorize } = require('../middleware/auth');

// Opportunity routes
router.route('/')
  .get(getOpportunities)
  .post(protect, authorize('admin', 'mentor'), createOpportunity);

router.route('/:id')
  .get(getOpportunity)
  .put(protect, authorize('admin', 'mentor'), updateOpportunity)
  .delete(protect, authorize('admin', 'mentor'), deleteOpportunity);

router.route('/:id/apply')
  .post(protect, applyToOpportunity);

// Application routes
router.get('/my-applications', protect, getMyApplications);
router.get('/applications/:id', protect, getApplication);
router.put('/applications/:id/status', protect, authorize('admin'), updateApplicationStatus);

module.exports = router;
