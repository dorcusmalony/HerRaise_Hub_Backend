const db = require('../config/database');
const webpush = require('web-push');
const { getIO } = require('./socketService');

class NotificationService {
  // Create a new notification
  async createNotification(userId, type, title, message, data = {}, priority = 'normal') {
    try {
      const { Notification } = db.models;
      
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        priority
      });

      // Send real-time notification via socket
      this.sendSocketNotification(userId, notification);

      // Send push notification
      this.sendPushNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send real-time notification via socket
  sendSocketNotification(userId, notification) {
    const io = getIO();
    if (io) {
      console.log(`📤 Sending socket notification to user_${userId}:`, notification.title);
      io.to(`user_${userId}`).emit('notification', notification);
    } else {
      console.log('⚠️ Socket.IO not initialized');
    }
  }

  // Send push notification
  async sendPushNotification(userId, notification) {
    try {
      const { PushSubscription } = db.models;
      if (!PushSubscription) {
        console.log('⚠️ PushSubscription model not found, skipping push notifications');
        return;
      }
      
      const subscriptions = await PushSubscription.findAll({
        where: { userId }
      });

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: notification.data
      });

      const promises = subscriptions.map(sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey
          }
        };

        return webpush.sendNotification(pushSubscription, payload)
          .catch(error => {
            console.error('Push notification failed:', error);
            // Remove invalid subscription
            if (error.statusCode === 410) {
              this.removeInvalidSubscription(sub.id);
            }
          });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  // Remove invalid subscription
  async removeInvalidSubscription(subscriptionId) {
    try {
      const { PushSubscription } = db.models;
      await PushSubscription.destroy({ where: { id: subscriptionId } });
    } catch (error) {
      console.error('Error removing invalid subscription:', error);
    }
  }

  // Notify about new forum question
  async notifyNewForumQuestion(questionData, excludeUserId) {
    try {
      // Get all users except the question author
      const { User } = db.models;
      const users = await User.findAll({
        where: { id: { [db.sequelize.Sequelize.Op.ne]: excludeUserId } },
        attributes: ['id']
      });

      const promises = users.map(user => 
        this.createNotification(
          user.id,
          'forum_question',
          '❓ New Question Posted',
          `${questionData.author.name}: ${questionData.title}`,
          { postId: questionData.id, url: '/forum' },
          'normal'
        )
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error notifying new forum question:', error);
    }
  }

  // Notify about new answer
  async notifyNewAnswer(answerData) {
    try {
      await this.createNotification(
        answerData.questionAuthorId,
        'forum_answer',
        '💡 Someone Answered Your Question',
        `${answerData.author.name} answered: ${answerData.questionTitle}`,
        { postId: answerData.questionId, url: '/forum' },
        'high'
      );
    } catch (error) {
      console.error('Error notifying new answer:', error);
    }
  }

  // Notify about new comment
  async notifyNewComment(commentData) {
    try {
      await this.createNotification(
        commentData.postAuthorId,
        'forum_comment',
        '💬 New Comment',
        `${commentData.author.name} commented: "${commentData.content.substring(0, 50)}..."`,
        { postId: commentData.postId, url: '/forum' },
        'normal'
      );
    } catch (error) {
      console.error('Error notifying new comment:', error);
    }
  }

  // Notify about post like
  async notifyPostLiked(likeData) {
    try {
      await this.createNotification(
        likeData.postAuthorId,
        'forum_like',
        '❤️ Someone Liked Your Post',
        `${likeData.author.name} liked your post: ${likeData.postTitle}`,
        { postId: likeData.postId, url: '/forum' },
        'low'
      );
    } catch (error) {
      console.error('Error notifying post liked:', error);
    }
  }

  // Notify about new opportunity
  async notifyNewOpportunity(opportunityData) {
    try {
      const { User } = db.models;
      const users = await User.findAll({ attributes: ['id'] });
      
      const promises = users.map(user => 
        this.createNotification(
          user.id,
          'opportunity',
          '🎯 New Opportunity Available',
          `New ${opportunityData.type}: ${opportunityData.title}`,
          { opportunityId: opportunityData.id, url: '/opportunities' },
          'high'
        )
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error notifying new opportunity:', error);
    }
  }

  // Notify about new resource
  async notifyNewResource(resourceData) {
    try {
      const { User } = db.models;
      const users = await User.findAll({ attributes: ['id'] });
      
      const promises = users.map(user => 
        this.createNotification(
          user.id,
          'website_update',
          '📚 New Resource Added',
          `New resource: ${resourceData.title}`,
          { resourceId: resourceData.id, url: '/resources' },
          'normal'
        )
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error notifying new resource:', error);
    }
  }
}

module.exports = new NotificationService();