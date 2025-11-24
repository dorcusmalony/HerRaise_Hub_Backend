const cron = require('node-cron');
const db = require('../config/database');
const { Op } = require('sequelize');

// Send application reminder email
const sendApplicationReminderEmail = async (userEmail, userName, opportunity, application) => {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #333;"> Application Reminder</h2>
      <p>Hi ${userName},</p>
      <p>This is a reminder about your application:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #007bff;">${opportunity.title}</h3>
        <p><strong>Organization:</strong> ${opportunity.organization}</p>
        <p><strong>Type:</strong> ${opportunity.type}</p>
        <p><strong>Deadline:</strong> ${new Date(opportunity.applicationDeadline).toLocaleDateString()}</p>
        <p><strong>Current Status:</strong> ${application.status}</p>
      </div>

      ${application.notes ? `<p><strong>Your Notes:</strong> ${application.notes}</p>` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href='${opportunity.applicationLink}' 
           style="background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Apply Now
        </a>
      </div>
      
      <p>Good luck with your application!</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        HerRaise Hub - Empowering Women in South Sudan
      </p>
    </div>
  `;

  // Reuse existing email service
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: ` Reminder: ${opportunity.title} Application`,
    html
  });
};

// Check and send reminders (runs every hour)
const checkReminders = async () => {
  try {
    const { UserApplication, User, Opportunity } = db.models;
    const now = new Date();

    // Find applications with reminders due
    const applicationsWithReminders = await UserApplication.findAll({
      where: {
        nextReminderDate: {
          [Op.lte]: now
        }
      },
      include: [
        { model: User, attributes: ['email', 'name'] },
        { model: Opportunity }
      ]
    });

    console.log(` Found ${applicationsWithReminders.length} reminders to send`);

    for (const application of applicationsWithReminders) {
      try {
        await sendApplicationReminderEmail(
          application.User.email,
          application.User.name,
          application.Opportunity,
          application
        );

        // Clear the reminder date after sending
        application.nextReminderDate = null;
        await application.save();

        console.log(`Reminder sent to ${application.User.email}`);
      } catch (error) {
        console.error(` Failed to send reminder to ${application.User.email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

// Send new opportunity notifications
const sendNewOpportunityNotification = async (opportunity) => {
  const { User } = db.models;
  const users = await User.findAll({ where: { isActive: true } });
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #007bff;"> New ${opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)} Alert!</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333;">${opportunity.title}</h3>
        <p><strong>Organization:</strong> ${opportunity.organization}</p>
        <p><strong>Deadline:</strong> ${new Date(opportunity.applicationDeadline).toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${opportunity.location}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href='${opportunity.applicationLink}' 
           style="background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          View Details & Apply
        </a>
      </div>
    </div>
  `;

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  for (const user of users.slice(0, 10)) { // Limit to prevent spam
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: ` New ${opportunity.type}: ${opportunity.title}`,
        html
      });
    } catch (error) {
      console.error(`Failed to send notification to ${user.email}:`, error);
    }
  }
};

// Check for upcoming deadlines with countdown (runs daily at 9 AM)
const checkUpcomingDeadlines = async () => {
  try {
    const { UserApplication, User } = db.models;
    const { getExpiringOpportunities } = require('./countdownService');
    
    // Get opportunities expiring in 3 days
    const expiringOpportunities = await getExpiringOpportunities(3);
    
    for (const opportunity of expiringOpportunities) {
      // Find users tracking this opportunity
      const trackingUsers = await UserApplication.findAll({
        where: {
          opportunityId: opportunity.id,
          status: { [Op.in]: ['interested', 'preparing'] }
        },
        include: [{ model: User, attributes: ['email', 'name'] }]
      });

      for (const application of trackingUsers) {
        const daysLeft = opportunity.countdown.daysLeft;
        let urgencyMessage = '';
        
        if (daysLeft === 0) urgencyMessage = ' DEADLINE TODAY!';
        else if (daysLeft === 1) urgencyMessage = ' Only 1 day left!';
        else urgencyMessage = ` Only ${daysLeft} days left!`;

        try {
          await sendApplicationReminderEmail(
            application.User.email,
            application.User.name,
            opportunity,
            { ...application, notes: urgencyMessage }
          );

          console.log(`Countdown reminder sent to ${application.User.email} - ${daysLeft} days left`);
        } catch (error) {
          console.error('Failed to send countdown reminder:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking upcoming deadlines:', error);
  }
};

// Initialize cron jobs
const initializeReminderCrons = () => {
  // Check reminders every hour
  cron.schedule('0 * * * *', checkReminders);
  
  // Check upcoming deadlines daily at 10 AM (different from reminder service)
  cron.schedule('0 10 * * *', checkUpcomingDeadlines);
  
  console.log('Application reminder cron jobs initialized');
};

module.exports = {
  initializeReminderCrons,
  checkReminders,
  checkUpcomingDeadlines,
  sendNewOpportunityNotification
};