const NotificationService = require('../services/notificationService');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const notifications = await NotificationService.getUserNotifications(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      notifications: notifications.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(notifications.count / limit),
        totalItems: notifications.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await NotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Subscribe to push notifications
exports.subscribeToPush = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;
    
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    const { PushSubscription } = require('../config/database').models;
    
    // Create or update subscription
    await PushSubscription.upsert({
      userId,
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth
    });

    res.json({
      success: true,
      message: 'Push subscription saved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save push subscription',
      error: error.message
    });
  }
};

// Unsubscribe from push notifications
exports.unsubscribeFromPush = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    const { PushSubscription } = require('../config/database').models;
    
    await PushSubscription.destroy({
      where: { userId, endpoint }
    });

    res.json({
      success: true,
      message: 'Push subscription removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription',
      error: error.message
    });
  }
};

// Create test notification (for testing)
exports.createTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notification = await NotificationService.createNotification(
      userId,
      'forum_like',
      'Test Notification',
      'This is a test notification to verify the system is working',
      { test: true },
      'normal'
    );

    res.json({
      success: true,
      message: 'Test notification created',
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    });
  }
};

// Create website notification (admin only)
exports.createWebsiteNotification = async (req, res) => {
  try {
    const { title, message, data } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notifiedCount = await NotificationService.notifyWebsiteUpdate(
      title,
      message,
      data || {}
    );

    res.json({
      success: true,
      message: `Website notification sent to ${notifiedCount} users`,
      notifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create website notification',
      error: error.message
    });
  }
};