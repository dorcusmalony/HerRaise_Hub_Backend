const cron = require('node-cron');
const db = require('../config/database');
const emailService = require('./emailService');
const NotificationService = require('./notificationService');

class ReminderService {
  // Check for reminders daily at 9 AM
  static startReminderScheduler() {
    cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Running daily reminder check...');
      await this.sendDeadlineReminders();
    }, {
      timezone: process.env.TZ || 'Africa/Juba'
    });
    
    console.log('📅 Reminder scheduler started - runs daily at 9 AM');
  }

  static async sendDeadlineReminders() {
    try {
      const { OpportunityInteraction, Opportunity, User } = db.models;
      
      // Find opportunities with deadlines in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const startOfDay = new Date(threeDaysFromNow);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(threeDaysFromNow);
      endOfDay.setHours(23, 59, 59, 999);

      // Get users who want reminders for opportunities due in 3 days
      const interactions = await OpportunityInteraction.findAll({
        where: {
          wantsReminder: true,
          reminderSent: false
        },
        include: [
          {
            model: Opportunity,
            where: {
              applicationDeadline: {
                [db.sequelize.Sequelize.Op.between]: [startOfDay, endOfDay]
              }
            }
          },
          {
            model: User,
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      console.log(`📬 Found ${interactions.length} reminders to send`);

      for (const interaction of interactions) {
        try {
          const user = interaction.User;
          const opportunity = interaction.Opportunity;
          
          // Send email reminder
          await emailService.sendDeadlineReminder(user, opportunity);
          
          // Send notification
          await NotificationService.createNotification(
            user.id,
            'deadline_reminder',
            '⏰ Application Deadline Reminder',
            `Don't forget! ${opportunity.title} deadline is in 3 days (${opportunity.applicationDeadline.toDateString()})`,
            { 
              opportunityId: opportunity.id, 
              url: '/opportunities',
              deadline: opportunity.applicationDeadline 
            },
            'high'
          );

          // Mark reminder as sent
          interaction.reminderSent = true;
          interaction.reminderSentAt = new Date();
          await interaction.save();

          console.log(`✅ Reminder sent to ${user.name} for ${opportunity.title}`);
        } catch (error) {
          console.error('❌ Failed to send reminder:', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error in reminder service:', error);
    }
  }

  // Manual trigger for testing
  static async triggerReminders() {
    console.log('🔔 Manually triggering reminders...');
    await this.sendDeadlineReminders();
  }
}

module.exports = ReminderService;