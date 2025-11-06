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

// Optional auth middleware - allows both authenticated and unauthenticated access
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
    
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = require('../config/database');
      
      // Wait for database connection
      if (!db.models || !db.models.User) {
        console.log('⚠️ Database models not ready, skipping auth');
        return next();
      }
      
      const user = await db.models.User.findByPk(decoded.id);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Opportunity routes
router.route('/')
  .get(getOpportunities)
  .post(protect, createOpportunity);

router.route('/:id')
  .get(optionalAuth, getOpportunity)
  .put(protect, authorize('admin', 'mentor'), updateOpportunity)
  .delete(protect, authorize('admin', 'mentor'), deleteOpportunity);

router.route('/:id/apply')
  .post(protect, applyToOpportunity);

// Application routes
router.get('/my-applications', protect, getMyApplications);
router.get('/applications/:id', protect, getApplication);
router.put('/applications/:id/status', protect, authorize('admin'), updateApplicationStatus);

module.exports = router;
