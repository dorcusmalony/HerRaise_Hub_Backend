const db = require('../config/database');
const { broadcast } = require('./socketService');

class NotificationService {
  // Create notification in database
  static async createNotification(userId, type, title, message, data = {}, relatedId = null, link = null) {
    try {
      const { Notification } = db.models;
      
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        relatedId,
        link,
        readStatus: false
      });

      // Send real-time notification
      broadcast('notification', {
        id: notification.id,
        type,
        title,
        message,
        data,
        timestamp: notification.createdAt,
        userId
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Send notification to all users except sender
  static async notifyAllUsers(type, title, message, data = {}, excludeUserId = null, link = null) {
    try {
      const { User } = db.models;
      
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id']
      });

      const notifications = users
        .filter(user => user.id !== excludeUserId)
        .map(user => ({
          userId: user.id,
          type,
          title,
          message,
          data,
          link,
          readStatus: false
        }));

      if (notifications.length > 0) {
        const { Notification } = db.models;
        await Notification.bulkCreate(notifications);
        
        // Send real-time notifications
        broadcast('notification', {
          type,
          title,
          message,
          data,
          timestamp: new Date(),
          broadcast: true
        });
      }

      console.log(` Sent ${type} notification to ${notifications.length} users`);
    } catch (error) {
      console.error('Error sending notifications to all users:', error);
    }
  }

  // New opportunity notification
  static async notifyNewOpportunity(opportunity, creatorId) {
    await this.notifyAllUsers(
      'opportunity',
      ` New ${opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}!`,
      `${opportunity.title} - Check it out now!`,
      {
        opportunityId: opportunity.id,
        opportunityType: opportunity.type,
        organization: opportunity.organization
      },
      creatorId,
      `/opportunities/${opportunity.id}`
    );
  }

  // New forum post notification (disabled - too spammy)
  static async notifyNewForumQuestion(post, authorId) {
    // Don't notify all users for new posts - too spammy
    console.log(` New forum post created: ${post.title} by ${post.author.name}`);
  }

  // New comment notification (to post author)
  static async notifyNewComment(comment, post, commentAuthorId) {
    if (post.authorId !== commentAuthorId) {
      await this.createNotification(
        post.authorId,
        'forum_comment',
        ' New Comment on Your Post',
        `${comment.author.name} commented on "${post.title}"`,
        {
          postId: post.id,
          commentId: comment.id,
          commentAuthor: comment.author.name
        },
        comment.id,
        `/forum/posts/${post.id}`
      );
    }
  }

  // Like notification
  static async notifyPostLike(post, likerUserId, likerName) {
    if (post.authorId !== likerUserId) {
      await this.createNotification(
        post.authorId,
        'forum_like',
        ' Someone Liked Your Post',
        `${likerName} liked your post "${post.title}"`,
        {
          postId: post.id,
          likerName
        },
        post.id,
        `/forum/posts/${post.id}`
      );
    }
  }

  // File upload notification
  static async notifyFileUpload(fileName, uploaderName, uploaderId) {
    await this.notifyAllUsers(
      'forum_answer',
      '📎 New File Uploaded',
      `${uploaderName} uploaded: ${fileName}`,
      {
        fileName,
        uploaderName
      },
      uploaderId,
      '/forum'
    );
  }

  // Application status update
  static async notifyApplicationUpdate(userId, opportunity, status) {
    const statusMessages = {
      'under_review': ' Application Under Review',
      'shortlisted': ' You\'ve Been Shortlisted!',
      'accepted': ' Congratulations! Application Accepted',
      'rejected': ' Application Update'
    };

    await this.createNotification(
      userId,
      'application_update',
      statusMessages[status] || ' Application Update',
      `Your application for "${opportunity.title}" has been ${status.replace('_', ' ')}`,
      {
        opportunityId: opportunity.id,
        status
      },
      opportunity.id,
      `/opportunities/${opportunity.id}`
    );
  }

  // Deadline reminder
  static async notifyDeadlineReminder(userId, opportunity) {
    await this.createNotification(
      userId,
      'deadline_reminder',
      ' Deadline Reminder',
      `"${opportunity.title}" deadline is approaching in 3 days!`,
      {
        opportunityId: opportunity.id,
        deadline: opportunity.applicationDeadline
      },
      opportunity.id,
      `/opportunities/${opportunity.id}`
    );
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const { Notification } = db.models;
      
      if (!Notification) {
        console.warn(' Notification model not available in getUserNotifications');
        return { notifications: [], unreadCount: 0, total: 0 };
      }

      const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const unreadCount = await Notification.count({
        where: { userId, readStatus: false }
      });

      console.log(` User ${userId} has ${notifications.length} notifications, ${unreadCount} unread`);

      return {
        notifications,
        unreadCount,
        total: notifications.length
      };
    } catch (error) {
      console.error(' Error getting user notifications:', error.message);
      return { notifications: [], unreadCount: 0, total: 0 };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const { Notification } = db.models;
      
      await Notification.update(
        { readStatus: true },
        { 
          where: { 
            id: notificationId, 
            userId 
          } 
        }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    try {
      const { Notification } = db.models;
      
      await Notification.update(
        { readStatus: true },
        { where: { userId, readStatus: false } }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}

module.exports = NotificationService;