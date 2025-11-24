const cron = require('node-cron');
const { models } = require('../config/database');
const notificationService = require('./notificationService');
const { Op } = require('sequelize');

class ReminderService {
  // Check for opportunities with 3 days left and send reminders
  static async sendDeadlineReminders() {
    try {
      // Check if models are available
      if (!models || !models.Opportunity) {
        console.log('Database models not ready, skipping reminder check');
        return;
      }

      // Test database connection
      await models.Opportunity.findOne({ limit: 1 });

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const startOfDay = new Date(threeDaysFromNow);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(threeDaysFromNow);
      endOfDay.setHours(23, 59, 59, 999);

      // Find opportunities expiring in 3 days
      const expiringOpportunities = await models.Opportunity.findAll({
        where: {
          applicationDeadline: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });

      for (const opportunity of expiringOpportunities) {
        // Find users who want reminders for this opportunity
        const interestedUsers = await models.OpportunityInterest.findAll({
          where: {
            opportunityId: opportunity.id,
            isInterested: true,
            wantsReminder: true,
            reminderSent: false
          },
          include: [models.User]
        });

        for (const interest of interestedUsers) {
          // Send in-app notification only
          await notificationService.createNotification({
            userId: interest.userId,
            type: 'deadline_reminder',
            title: 'Complete Your Application',
            message: `Make sure to complete your application for "${opportunity.title}" - deadline is approaching in 3 days!`,
            relatedId: opportunity.id,
            relatedType: 'opportunity'
          });

          // Mark reminder as sent
          await interest.update({ reminderSent: true });
        }
      }

      console.log(` Found ${expiringOpportunities.length} opportunities expiring in 3 days`);
      console.log(` Sent deadline reminders for ${expiringOpportunities.length} opportunities`);
    } catch (error) {
      console.error('Error checking reminders:', error.message);
      // Don't let reminder errors crash the app
    }
  }

  // Send weekly reminders for all qualified opportunities
  static async sendWeeklyReminders() {
    try {
      const activeOpportunities = await models.Opportunity.findAll({
        where: {
          applicationDeadline: {
            [Op.gt]: new Date()
          }
        }
      });

      const allUsers = await models.User.findAll();

      for (const user of allUsers) {
        if (activeOpportunities.length > 0) {
          // Send in-app notification only
          await notificationService.createNotification({
            userId: user.id,
            type: 'weekly_reminder',
            title: 'Weekly Opportunities Digest',
            message: `${activeOpportunities.length} opportunities are still open for applications!`,
            relatedType: 'general'
          });
        }
      }

      console.log(`Sent weekly reminders to ${allUsers.length} users`);
    } catch (error) {
      console.error('Error sending weekly reminders:', error);
    }
  }

  // Notify all users about new opportunity
  static async notifyNewOpportunity(opportunity) {
    try {
      const allUsers = await models.User.findAll();
      
      for (const user of allUsers) {
        await notificationService.createNotification({
          userId: user.id,
          type: 'new_opportunity',
          title: 'New Opportunity Available',
          message: `New ${opportunity.type}: "${opportunity.title}" has been posted!`,
          relatedId: opportunity.id,
          relatedType: 'opportunity'
        });
      }
    } catch (error) {
      console.error('Error notifying new opportunity:', error);
    }
  }

  // Notify user when their opportunity gets a like
  static async notifyOpportunityLike(opportunityId, likerName) {
    try {
      const opportunity = await models.Opportunity.findByPk(opportunityId);
      if (opportunity) {
        await notificationService.createNotification({
          userId: opportunity.userId,
          type: 'opportunity_like',
          title: 'Your Opportunity Got a Like',
          message: `${likerName} liked your opportunity "${opportunity.title}"`,
          relatedId: opportunityId,
          relatedType: 'opportunity'
        });
      }
    } catch (error) {
      console.error('Error notifying opportunity like:', error);
    }
  }

  // Notify user when their opportunity gets a comment
  static async notifyOpportunityComment(opportunityId, commenterName, commentText) {
    try {
      const opportunity = await models.Opportunity.findByPk(opportunityId);
      if (opportunity) {
        await notificationService.createNotification({
          userId: opportunity.userId,
          type: 'opportunity_comment',
          title: 'New Comment on Your Opportunity',
          message: `${commenterName} commented on "${opportunity.title}": ${commentText.substring(0, 50)}...`,
          relatedId: opportunityId,
          relatedType: 'opportunity'
        });
      }
    } catch (error) {
      console.error('Error notifying opportunity comment:', error);
    }
  }

  // Notify user when someone replies to their comment
  static async notifyCommentReply(commentId, replierName, replyText) {
    try {
      const comment = await models.Comment.findByPk(commentId, {
        include: [models.Opportunity]
      });
      if (comment) {
        await notificationService.createNotification({
          userId: comment.userId,
          type: 'comment_reply',
          title: 'Reply to Your Comment',
          message: `${replierName} replied to your comment on "${comment.Opportunity.title}": ${replyText.substring(0, 50)}...`,
          relatedId: comment.opportunityId,
          relatedType: 'opportunity'
        });
      }
    } catch (error) {
      console.error('Error notifying comment reply:', error);
    }
  }

  // Start cron jobs
  static startReminderJobs() {
    // Daily check for 3-day deadline reminders at 9 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Running daily deadline reminder check...');
      this.sendDeadlineReminders();
    });

    // Weekly reminders every Monday at 10 AM
    cron.schedule('0 10 * * 1', () => {
      console.log('Running weekly opportunity reminders...');
      this.sendWeeklyReminders();
    });

    console.log('Reminder cron jobs started');
  }
}

module.exports = ReminderService;