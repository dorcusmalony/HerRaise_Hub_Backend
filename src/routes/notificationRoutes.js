const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToPush,
  unsubscribeFromPush,
  createTestNotification,
  createWebsiteNotification
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// Subscribe to push notifications
router.post('/subscribe', subscribeToPush);

// Unsubscribe from push notifications
router.delete('/unsubscribe', unsubscribeFromPush);

// Create test notification (for development)
router.post('/test', createTestNotification);

// Create website notification (admin only)
const adminJwt = require('../middleware/adminJwt');
router.post('/website-update', adminJwt, createWebsiteNotification);

module.exports = router;