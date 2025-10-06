const express = require('express');
const router = express.Router();
const {
  getResources,
  getResource,
  uploadResource,
  downloadResource,
  toggleLike,
  deleteResource,
  approveResource
} = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getResources)
  .post(protect, authorize('mentor', 'admin'), uploadResource);

router.route('/:id')
  .get(getResource)
  .delete(protect, authorize('admin', 'mentor'), deleteResource);

router.route('/:id/download')
  .get(protect, downloadResource);

router.route('/:id/like')
  .post(protect, toggleLike);

router.route('/:id/approve')
  .put(protect, authorize('admin'), approveResource);

module.exports = router;