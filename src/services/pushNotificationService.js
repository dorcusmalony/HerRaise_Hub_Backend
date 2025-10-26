const webpush = require('web-push');
const db = require('../config/database');

// Configure web-push (you'll need to generate VAPID keys)
webpush.setVapidDetails(
  'mailto:' + (process.env.ADMIN_EMAIL || 'admin@herraise.org'),
  process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key',
  process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key'
);

class PushNotificationService {
  // Send push notification to user
  static async sendPushNotification(userId, payload) {
    try {
      const { PushSubscription } = db.models;
      
      // Get user's push subscriptions
      const subscriptions = await PushSubscription.findAll({
        where: { userId }
      });

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
      }

      // Send to all user's devices
      const pushPromises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey
            }
          };

          await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
          console.log('Push notification sent successfully');
        } catch (error) {
          console.error('Failed to send push notification:', error);
          
          // Remove invalid subscription
          if (error.statusCode === 410) {
            await subscription.destroy();
            console.log(`Removed invalid subscription for user ${userId}`);
          }
        }
      });

      await Promise.all(pushPromises);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send notification to multiple users
  static async sendBulkPushNotification(userIds, payload) {
    const promises = userIds.map(userId => 
      this.sendPushNotification(userId, payload)
    );
    
    await Promise.allSettled(promises);
  }

  // Generate VAPID keys (run once to generate keys)
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }
}

module.exports = PushNotificationService;