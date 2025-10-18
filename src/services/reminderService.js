const cron = require('node-cron');
const db = require('../config/database');
const { notifyDeadlineReminder } = require('./socketService');
const nodemailer = require('nodemailer');

let transporter;

// Initialize email transporter
function initializeEmailTransporter() {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    console.log('✅ Email transporter initialized');
  } else {
    console.log('⚠️ Email credentials not configured');
  }
}

// Send email reminder
async function sendEmailReminder(user, opportunity, daysLeft) {
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: `"HerRaise Hub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Reminder: ${opportunity.title} deadline in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Application Deadline Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>This is a friendly reminder that the application deadline for:</p>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1F2937;">${opportunity.title}</h3>
            <p><strong>Organization:</strong> ${opportunity.organization || 'N/A'}</p>
            <p><strong>Type:</strong> ${opportunity.type}</p>
            <p><strong>Deadline:</strong> ${new Date(opportunity.applicationDeadline).toLocaleDateString()}</p>
            <p><strong>Days Left:</strong> <span style="color: #EF4444; font-weight: bold;">${daysLeft}</span></p>
          </div>
          
          <p>Don't miss this opportunity! Click below to apply:</p>
          <a href="${process.env.FRONTEND_URL}/opportunities/${opportunity.id}" 
             style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
            Apply Now
          </a>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The HerRaise Hub Team
          </p>
        </div>
      `
    });
    console.log(`📧 Reminder email sent to ${user.email} for opportunity ${opportunity.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return false;
  }
}

// Check and send reminders
async function checkAndSendReminders() {
  try {
    const { Opportunity, Application, User } = db.models;
    const now = new Date();
    
    // Get opportunities with upcoming deadlines (7 days, 3 days, 1 day)
    const reminderDays = [7, 3, 1];
    
    for (const days of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Find opportunities with deadlines matching this reminder window
      const opportunities = await Opportunity.findAll({
        where: {
          isActive: true,
          applicationDeadline: {
            [db.sequelize.Sequelize.Op.between]: [targetDate, endOfDay]
          }
        }
      });
      
      console.log(`📅 Found ${opportunities.length} opportunities with ${days}-day deadline`);
      
      for (const opportunity of opportunities) {
        // Get users who haven't applied yet but might be interested
        const applications = await Application.findAll({
          where: { opportunityId: opportunity.id },
          attributes: ['userId']
        });
        
        const appliedUserIds = applications.map(app => app.userId);
        
        // Get active users who haven't applied
        const interestedUsers = await User.findAll({
          where: {
            isActive: true,
            ...(appliedUserIds.length > 0 && {
              id: { [db.sequelize.Sequelize.Op.notIn]: appliedUserIds }
            })
          },
          limit: 100 // Limit to prevent spam
        });
        
        console.log(`👥 Sending reminders to ${interestedUsers.length} users for ${opportunity.title}`);
        
        for (const user of interestedUsers) {
          // Send WebSocket notification
          notifyDeadlineReminder(user.id, opportunity, days);
          
          // Send email reminder
          await sendEmailReminder(user, opportunity, days);
          
          // Update Application record with reminder sent
          const existingApp = await Application.findOne({
            where: { userId: user.id, opportunityId: opportunity.id }
          });
          
          if (existingApp) {
            const reminders = existingApp.remindersSent || [];
            reminders.push({
              sentAt: new Date(),
              daysBeforeDeadline: days,
              method: 'email+websocket'
            });
            existingApp.remindersSent = reminders;
            await existingApp.save();
          }
        }
      }
    }
    
    console.log('✅ Reminder check completed');
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
}

// Initialize cron jobs
function initializeCronJobs() {
  initializeEmailTransporter();
  
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', () => {
    console.log('🕐 Running scheduled reminder check...');
    checkAndSendReminders();
  }, {
    timezone: 'Africa/Juba' // Adjust to your timezone
  });
  
  // Optional: Run every hour during business hours (8 AM - 6 PM)
  cron.schedule('0 8-18 * * *', () => {
    console.log('🕐 Hourly reminder check...');
    checkAndSendReminders();
  }, {
    timezone: 'Africa/Juba'
  });
  
  console.log('✅ Cron jobs initialized');
  
  // Run immediately on startup (for testing)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      console.log('🧪 Running initial reminder check (development)...');
      checkAndSendReminders();
    }, 5000);
  }
}

module.exports = {
  initializeCronJobs,
  checkAndSendReminders,
  sendEmailReminder
};
