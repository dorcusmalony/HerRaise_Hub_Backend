const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 20, offset = 0, markAsRead = 'false' } = req.query;
    
    const result = await NotificationService.getUserNotifications(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    // Only mark as read if explicitly requested
    if (markAsRead === 'true') {
      await NotificationService.markAllAsRead(req.user.id);
      result.unreadCount = 0;
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const { Notification } = require('../config/database').models;
    
    if (!Notification) {
      console.warn('⚠️ Notification model not available');
      return res.json({
        success: true,
        unreadCount: 0
      });
    }

    const unreadCount = await Notification.count({
      where: { 
        userId: req.user.id, 
        readStatus: false 
      }
    });

    console.log(`📊 Unread count for user ${req.user.id}: ${unreadCount}`);

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('❌ Unread count error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      unreadCount: 0
    });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, recipientId, data, message } = req.body;
    
    if (!type || !recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Type, recipientId, and message are required'
      });
    }

    const notification = await NotificationService.createNotification(
      recipientId,
      type,
      message,
      message,
      data || {}
    );
    
    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Test notification system
// @route   POST /api/notifications/test
// @access  Private
router.post('/test', protect, async (req, res) => {
  try {
    const { Notification } = require('../config/database').models;
    
    if (!Notification) {
      return res.status(500).json({
        success: false,
        message: 'Notification model not available'
      });
    }

    // Create a test notification
    const testNotification = await Notification.create({
      userId: req.user.id,
      type: 'forum_like',
      title: '🎉 Test Notification',
      message: 'This is a test notification to verify the system is working!',
      data: { test: true, timestamp: new Date() },
      priority: 'normal'
    });

    // Get current unread count
    const unreadCount = await Notification.count({
      where: { 
        userId: req.user.id, 
        readStatus: false 
      }
    });

    console.log(`📢 Test notification created for user ${req.user.id}. Unread count: ${unreadCount}`);

    res.json({
      success: true,
      message: 'Test notification created successfully',
      notification: testNotification,
      unreadCount
    });
  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Debug notification system
// @route   GET /api/notifications/debug
// @access  Private
router.get('/debug', protect, async (req, res) => {
  try {
    const { Notification } = require('../config/database').models;
    
    const debug = {
      userId: req.user.id,
      userName: req.user.name,
      modelAvailable: !!Notification,
      timestamp: new Date().toISOString()
    };

    if (Notification) {
      // Get all notifications for this user
      const allNotifications = await Notification.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      const unreadCount = await Notification.count({
        where: { userId: req.user.id, readStatus: false }
      });

      const totalCount = await Notification.count({
        where: { userId: req.user.id }
      });

      debug.totalNotifications = totalCount;
      debug.unreadNotifications = unreadCount;
      debug.recentNotifications = allNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        readStatus: n.readStatus,
        createdAt: n.createdAt
      }));
    }

    console.log('🔍 Notification debug info:', debug);

    res.json({
      success: true,
      debug
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear
// @access  Private
router.delete('/clear', protect, async (req, res) => {
  try {
    const { Notification } = require('../config/database').models;
    
    const deletedCount = await Notification.destroy({
      where: { userId: req.user.id }
    });

    console.log(`🗑️ Cleared ${deletedCount} notifications for user ${req.user.id}`);

    res.json({
      success: true,
      message: `Cleared ${deletedCount} notifications`,
      deletedCount
    });
  } catch (error) {
    console.error('❌ Clear notifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;