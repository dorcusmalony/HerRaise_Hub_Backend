const cron = require('node-cron');
const { models } = require('../config/database');
const emailService = require('./emailService');
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
          // Send email reminder
          await emailService.sendDeadlineReminder(
            interest.user.email,
            interest.user.firstName,
            opportunity
          );

          // Send in-app notification
          await notificationService.createNotification({
            userId: interest.userId,
            type: 'deadline_reminder',
            title: 'Application Deadline Reminder',
            message: `Only 3 days left to apply for ${opportunity.title}!`,
            relatedId: opportunity.id,
            relatedType: 'opportunity'
          });

          // Mark reminder as sent
          await interest.update({ reminderSent: true });
        }
      }

      console.log(`Sent deadline reminders for ${expiringOpportunities.length} opportunities`);
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
          // Send weekly opportunity digest
          await emailService.sendWeeklyOpportunityDigest(
            user.email,
            user.firstName,
            activeOpportunities
          );

          // Send in-app notification
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