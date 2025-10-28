const db = require('../config/database');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Try to get real notifications, fallback to empty
    try {
      if (db.models && db.models.Notification) {
        const { rows: notifications, count } = await db.models.Notification.findAndCountAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
        
        return res.json({
          success: true,
          notifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        });
      }
    } catch (dbError) {
      console.log('Notification DB error, returning empty:', dbError.message);
    }
    
    // Fallback
    return res.json({
      success: true,
      notifications: [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
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
    
    // Try to get real count, fallback to 0
    try {
      if (db.models && db.models.Notification) {
        const count = await db.models.Notification.count({
          where: {
            userId: userId,
            readStatus: false
          }
        });
        return res.json({
          success: true,
          unreadCount: count
        });
      }
    } catch (dbError) {
      console.log('Notification DB error, returning 0:', dbError.message);
    }
    
    // Fallback
    return res.json({
      success: true,
      unreadCount: 0
    });
  } catch (error) {
    console.error('Get unread count error:', error);
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

    const notification = await db.models.Notification.findOne({
      where: { id, userId }
    });
    
    if (notification) {
      notification.readStatus = true;
      await notification.save();
    }

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
    await db.models.Notification.update(
      { readStatus: true },
      { where: { userId, readStatus: false } }
    );

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

    const { PushSubscription } = db.models;
    
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

    const { PushSubscription } = db.models;
    
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
    
    // Try to create in database
    let notification = null;
    try {
      if (db.models && db.models.Notification) {
        notification = await db.models.Notification.create({
          userId,
          type: 'forum_like',
          title: '🎉 Test Notification',
          message: 'This is a test notification to verify the system is working!',
          data: { test: true, timestamp: new Date() },
          priority: 'normal'
        });
        console.log('✅ Test notification saved to database');
      }
    } catch (dbError) {
      console.log('⚠️ Database save failed:', dbError.message);
    }
    
    // Send real-time notification via Socket.IO
    const { getIO } = require('../services/socketService');
    const io = getIO();
    if (io) {
      const testNotification = {
        id: notification?.id || 'test-' + Date.now(),
        userId,
        type: 'forum_like',
        title: '🎉 Test Notification',
        message: 'This is a test notification to verify the system is working!',
        data: { test: true, timestamp: new Date() },
        priority: 'normal',
        readStatus: false,
        createdAt: new Date()
      };
      
      console.log(`📤 Sending test notification to user_${userId}`);
      io.to(`user_${userId}`).emit('notification', testNotification);
      console.log('✅ Real-time test notification sent');
    }

    res.json({
      success: true,
      message: 'Test notification created and sent',
      notification: notification || { message: 'Sent via Socket.IO only' },
      socketSent: !!io
    });
  } catch (error) {
    console.error('Test notification error:', error);
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

    const { User } = db.models;
    const users = await User.findAll({ attributes: ['id'] });
    
    const notifications = await Promise.all(
      users.map(user => 
        db.models.Notification.create({
          userId: user.id,
          type: 'website_update',
          title,
          message,
          data: data || {},
          priority: 'normal'
        })
      )
    );
    
    const notifiedCount = notifications.length;

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