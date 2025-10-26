const express = require('express');
const router = express.Router();
const adminJwt = require('../middleware/adminJwt');
const {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  toggleStatus,
  toggleFeatured,
  getStats,
  bulkUpdate,
  registerAdmin,
  getAllOpportunities,
  createItem
} = require('../controllers/adminOpportunityController');

// Apply JWT protection to all admin routes
router.use(adminJwt);

// Statistics
router.get('/stats', getStats);

// CRUD operations
router.get('/', getOpportunities);
router.get('/all', getAllOpportunities); // Combined opportunities + scholarships
router.post('/', createOpportunity);
router.post('/create', createItem); // Create opportunity or scholarship
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