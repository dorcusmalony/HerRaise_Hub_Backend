const db = require('../config/database');

// Subscribe to push notifications
exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.id;
    
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    const { PushSubscription } = db.models;
    
    // Create or update subscription
    await PushSubscription.findOrCreate({
      where: { 
        userId, 
        endpoint 
      },
      defaults: {
        p256dhKey: keys.p256dh,
        authKey: keys.auth
      }
    });

    res.json({
      success: true,
      message: 'Push notifications enabled successfully'
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable push notifications'
    });
  }
};

// Unsubscribe from push notifications
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;
    
    const { PushSubscription } = db.models;
    
    await PushSubscription.destroy({
      where: { 
        userId, 
        endpoint 
      }
    });

    res.json({
      success: true,
      message: 'Push notifications disabled successfully'
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable push notifications'
    });
  }
};

// Get VAPID public key for frontend
exports.getVapidKey = async (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
};