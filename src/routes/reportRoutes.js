const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReport,
  updateReportStatus
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Public endpoint for reporters (allows anonymous reports)
router.post('/', createReport);

// Mentor/Admin endpoints
router.get('/', protect, authorize('mentor', 'admin'), getReports);
router.get('/:id', protect, getReport);
router.put('/:id', protect, authorize('admin'), updateReportStatus);

module.exports = router;
