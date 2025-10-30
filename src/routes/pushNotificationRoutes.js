const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  subscribe,
  unsubscribe,
  getVapidKey
} = require('../controllers/pushNotificationController');

// Get VAPID public key (public endpoint)
router.get('/vapid-key', getVapidKey);

// Subscribe to push notifications
router.post('/subscribe', protect, subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', protect, unsubscribe);

module.exports = router;