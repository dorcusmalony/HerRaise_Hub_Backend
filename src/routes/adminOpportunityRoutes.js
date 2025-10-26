const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  toggleStatus,
  toggleFeatured,
  getStats,
  bulkUpdate,
  registerAdmin // Add this import
} = require('../controllers/adminOpportunityController');

// Apply admin protection to all routes
router.use(protect, requireAdmin);

// Statistics
router.get('/stats', getStats);

// CRUD operations
router.get('/', getOpportunities);
router.post('/', createOpportunity);
router.put('/:id', updateOpportunity);
router.delete('/:id', deleteOpportunity);

// Status management
router.patch('/:id/toggle-status', toggleStatus);
router.patch('/:id/toggle-featured', toggleFeatured);

// Bulk operations
router.post('/bulk', bulkUpdate);

// Admin registration route
router.post('/register', registerAdmin);

module.exports = router;