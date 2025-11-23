const db = require('../config/database');
const NotificationService = require('../services/notificationService');
const { Op } = require('sequelize');

async function sendIncompleteApplicationReminders(userId) {
  try {
    const { Application, Opportunity, Notification } = db.models;
    
    // Find all draft/incomplete applications
    const incompleteApps = await Application.findAll({
      where: { 
        userId,
        status: ['draft', 'in_progress']
      },
      include: [{
        model: Opportunity,
        attributes: ['id', 'title', 'organization', 'applicationDeadline']
      }]
    });

    if (incompleteApps.length === 0) return;

    // Send notification for each incomplete application
    for (const app of incompleteApps) {
      const opportunity = app.Opportunity;
      
      // Check if notification already exists for this application
      const existingNotif = await Notification.findOne({
        where: {
          userId,
          type: 'application_update',
          data: {
            applicationId: app.id
          }
        }
      });

      // Skip if notification already sent
      if (existingNotif) {
        console.log(`⏭️ Notification already exists for application ${app.id}, skipping`);
        continue;
      }

      const daysLeft = Math.ceil((new Date(opportunity.applicationDeadline) - new Date()) / (1000 * 60 * 60 * 24));
      
      await NotificationService.createNotification(
        userId,
        'application_update',
        '📝 Complete Your Application',
        `You have an incomplete application for "${opportunity.title}" at ${opportunity.organization}. ${daysLeft} days left to submit!`,
        {
          opportunityId: opportunity.id,
          applicationId: app.id,
          daysRemaining: daysLeft,
          status: app.status
        },
        app.id,
        `/opportunities/${opportunity.id}`
      );
    }

    console.log(`📬 Sent application reminders to user ${userId}`);
  } catch (error) {
    console.error('Error sending application reminders:', error.message);
  }
}

module.exports = { sendIncompleteApplicationReminders };
