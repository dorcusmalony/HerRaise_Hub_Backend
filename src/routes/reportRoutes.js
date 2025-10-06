const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReport,
  updateReportStatus
} = require('../controllers/reportController');
const {
  submitSafetyReport,
  getSafetyReports,
  updateSafetyReport
} = require('../controllers/safetyReportController');
const { protect, authorize } = require('../middleware/auth');

// Public endpoint for reporters (allows anonymous reports)
router.post('/', createReport);

// Safety reporting endpoints (enhanced security focus)
router.post('/safety', submitSafetyReport);
router.get('/safety', protect, authorize('admin'), getSafetyReports);
router.put('/safety/:id', protect, authorize('admin'), updateSafetyReport);

// Standard report management endpoints
router.get('/', protect, authorize('mentor', 'admin'), getReports);
router.get('/:id', protect, getReport);
router.put('/:id', protect, authorize('admin'), updateReportStatus);

module.exports = router;
