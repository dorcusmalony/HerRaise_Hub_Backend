const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await NotificationService.getUserNotifications(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

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
    
    const unreadCount = await Notification.count({
      where: { 
        userId: req.user.id, 
        readStatus: false 
      }
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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

// @desc    Create comment notification
// @route   POST /api/notifications/comment
// @access  Private
router.post('/comment', protect, async (req, res) => {
  try {
    const { postId, commentId, postTitle } = req.body;
    
    if (!postId || !commentId || !postTitle) {
      return res.status(400).json({
        success: false,
        message: 'postId, commentId, and postTitle are required'
      });
    }
    
    await NotificationService.createCommentNotification(
      postId,
      commentId,
      req.user.id,
      req.user.name,
      postTitle
    );
    
    res.json({
      success: true,
      message: 'Comment notification created'
    });
  } catch (error) {
    console.error('Create comment notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Create comment notification (alternative endpoint)
// @route   POST /api/notifications/createCommentNotification
// @access  Private
router.post('/createCommentNotification', protect, async (req, res) => {
  try {
    const { postId, commentId, postTitle } = req.body;
    
    if (!postId || !commentId || !postTitle) {
      return res.status(400).json({
        success: false,
        message: 'postId, commentId, and postTitle are required'
      });
    }
    
    await NotificationService.createCommentNotification(
      postId,
      commentId,
      req.user.id,
      req.user.name,
      postTitle
    );
    
    res.json({
      success: true,
      message: 'Comment notification created'
    });
  } catch (error) {
    console.error('Create comment notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;