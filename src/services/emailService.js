const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html || options.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Password reset email template
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi ${userName},</p>
      <p>You requested to reset your password for your HerRaise Hub account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
      <p><strong>This link will expire in 10 minutes.</strong></p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        HerRaise Hub - Empowering Women in South Sudan
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Your Password - HerRaise Hub',
    html
  });
};

// Welcome email template
const sendWelcomeEmail = async (email, userName) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px; background-color: #ff0043; color: white;">
        <h1>Welcome to HerRaise Hub! 🎉</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #333;">Hi ${userName}! 👋</h2>
        <p>Congratulations! Your account has been successfully created on <strong>HerRaise Hub</strong> - the platform empowering women in South Sudan!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #ff0043; margin-top: 0;">🚀 Ready to get started?</h3>
          <p style="margin-bottom: 15px;">Click the button below to log in and access your personalized dashboard:</p>
          <div style="text-align: center;">
            <a href="${loginUrl}" 
               style="background-color: #ff0043; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Log In to Your Dashboard 🔑
            </a>
          </div>
        </div>
        
        <h3 style="color: #ff0043;">What awaits you in your dashboard:</h3>
        <ul style="line-height: 1.8;">
          <li>🎓 <strong>Opportunities Hub:</strong> Discover scholarships, internships, and competitions tailored for you</li>
          <li>💬 <strong>Community Forum:</strong> Connect, share experiences, and support other women</li>
          <li>👩🏫 <strong>Mentorship Network:</strong> Find experienced mentors to guide your journey</li>
          <li>📚 <strong>Learning Resources:</strong> Access educational materials and career development tools</li>
          <li>🛡️ <strong>Safety & Support:</strong> Use our safety resources and confidential reporting tools</li>
          <li>📊 <strong>Progress Tracking:</strong> Monitor your applications and achievements</li>
        </ul>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2d5a2d;"><strong>💡 Pro Tip:</strong> Complete your profile after logging in to get personalized opportunity recommendations!</p>
        </div>
        
        <p>If you have any questions or need assistance, our community is here to help. You can also reach out to our support team anytime.</p>
        
        <p>Welcome to a community where we rise together! 💪</p>
        
        <p>Best regards,<br>
        <strong>The HerRaise Hub Team</strong></p>
      </div>
      <hr style="margin: 30px 0;">
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>HerRaise Hub - Empowering Women in South Sudan</p>
        <p>
          <a href="${loginUrl}" style="color: #ff0043; text-decoration: none;">Login</a> | 
          <a href="${process.env.FRONTEND_URL}" style="color: #ff0043; text-decoration: none;">Visit Platform</a> | 
          <a href="${process.env.FRONTEND_URL}/resources" style="color: #ff0043; text-decoration: none;">Resources</a>
        </p>
        <p style="margin-top: 15px; font-size: 11px;">This email was sent because you registered for a HerRaise Hub account.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: '🎉 Welcome to HerRaise Hub - Let\'s Empower Your Journey!',
    html
  });
};

// Deadline reminder email template
const sendDeadlineReminder = async (email, firstName, opportunity) => {
  const opportunityUrl = `${process.env.FRONTEND_URL}/opportunities/${opportunity.id}`;
  const deadlineDate = new Date(opportunity.applicationDeadline).toLocaleDateString();
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px; background-color: #ff6b35; color: white;">
        <h1>⏰ Deadline Reminder!</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #333;">Hi ${firstName}! 👋</h2>
        <p>This is a friendly reminder about an opportunity you showed interest in:</p>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b35;">
          <h3 style="color: #ff6b35; margin-top: 0;">${opportunity.title}</h3>
          <p><strong>Type:</strong> ${opportunity.type}</p>
          <p><strong>Organization:</strong> ${opportunity.organization || 'Not specified'}</p>
          <p style="color: #d63384; font-weight: bold;">⚠️ <strong>Deadline:</strong> ${deadlineDate} (3 days left!)</p>
        </div>
        
        <p>Don't miss out on this amazing opportunity! Make sure to submit your application before the deadline.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${opportunityUrl}" 
             style="background-color: #ff6b35; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Opportunity Details 🔗
          </a>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2d5a2d;"><strong>💡 Quick Tip:</strong> Set aside time today to complete your application. Good luck!</p>
        </div>
        
        <p>We're rooting for you! 💪</p>
        
        <p>Best regards,<br>
        <strong>The HerRaise Hub Team</strong></p>
      </div>
      <hr style="margin: 30px 0;">
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>HerRaise Hub - Empowering Women in South Sudan</p>
        <p>You received this reminder because you requested to be notified about this opportunity.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: `⏰ Reminder: ${opportunity.title} deadline in 3 days!`,
    html
  });
};

// New opportunity email template
const sendNewOpportunityEmail = async (user, opportunity) => {
  const opportunityUrl = `${process.env.FRONTEND_URL}/opportunities/${opportunity.id}`;
  const deadlineDate = new Date(opportunity.applicationDeadline).toLocaleDateString();
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px; background-color: #6A1B9A; color: white;">
        <h1>🎯 New ${opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)} Available!</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #333;">Hi ${user.name}! 👋</h2>
        <p>Great news! A new ${opportunity.type} has just been posted on HerRaise Hub:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6A1B9A;">
          <h3 style="color: #6A1B9A; margin-top: 0;">${opportunity.title}</h3>
          <p><strong>Type:</strong> ${opportunity.type}</p>
          <p><strong>Organization:</strong> ${opportunity.organization || 'Not specified'}</p>
          <p><strong>Location:</strong> ${opportunity.location || 'Not specified'}</p>
          <p style="color: #d63384; font-weight: bold;">📅 <strong>Deadline:</strong> ${deadlineDate}</p>
          <p><strong>Description:</strong></p>
          <p style="color: #666;">${opportunity.description.substring(0, 200)}...</p>
        </div>
        
        <p>Don't miss out on this amazing opportunity! Click below to view full details and apply:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${opportunityUrl}" 
             style="background-color: #6A1B9A; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View & Apply Now 🚀
          </a>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2d5a2d;"><strong>💡 Pro Tip:</strong> Apply early! Many opportunities are reviewed on a rolling basis.</p>
        </div>
        
        <p>Best of luck with your application! We're here to support your journey. 💪</p>
        
        <p>Best regards,<br>
        <strong>The HerRaise Hub Team</strong></p>
      </div>
      <hr style="margin: 30px 0;">
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>HerRaise Hub - Empowering Women in South Sudan</p>
        <p>You received this email because you're a registered member of HerRaise Hub.</p>
        <p><a href="${process.env.FRONTEND_URL}/profile" style="color: #6A1B9A;">Update notification preferences</a></p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: `🎯 New ${opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}: ${opportunity.title}`,
    html
  });
};

// Send email to all users about new opportunity
const sendNewOpportunityEmailToAll = async (opportunity) => {
  try {
    const db = require('../config/database');
    const { User } = db.models;
    
    // Get all active users
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'email']
    });

    console.log(`📧 Sending opportunity emails to ${users.length} users`);
    
    // Send emails in batches to avoid overwhelming the email service
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const emailPromises = batch.map(user => 
        sendNewOpportunityEmail(user, opportunity).catch(error => {
          console.error(`Failed to send email to ${user.email}:`, error.message);
        })
      );
      
      await Promise.allSettled(emailPromises);
      
      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Opportunity email notifications sent successfully`);
  } catch (error) {
    console.error('Error sending opportunity emails to all users:', error);
  }
};

// Send weekly opportunity digest
const sendWeeklyOpportunityDigest = async (email, firstName, opportunities) => {
  try {
    const opportunityList = opportunities.map(opp => `
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h4 style="color: #2c3e50; margin-top: 0;">${opp.title}</h4>
        <p style="color: #555; font-size: 14px;">${opp.description.substring(0, 150)}...</p>
        <div style="margin: 10px 0;">
          <strong>Deadline:</strong> ${new Date(opp.applicationDeadline).toLocaleDateString()}
        </div>
        <a href="${opp.applicationLink}" 
           style="background-color: #28a745; color: white; padding: 8px 16px; 
                  text-decoration: none; border-radius: 4px; font-size: 14px;">
          View Details
        </a>
      </div>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📚 Weekly Opportunities Digest</h2>
        <p>Hi ${firstName},</p>
        <p>Here are the current opportunities still open for applications:</p>
        ${opportunityList}
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #1976d2; margin: 0; text-align: center;">
            💡 <strong>Tip:</strong> Don't wait until the last minute - start your applications early!
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">Best regards,<br>HerRaise Hub Team</p>
      </div>
    `;

    return await sendEmail({
      to: email,
      subject: `Weekly Opportunities Digest - ${opportunities.length} Open Applications`,
      html
    });
  } catch (error) {
    console.error('Error sending weekly digest:', error);
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendDeadlineReminder,
  sendNewOpportunityEmail,
  sendNewOpportunityEmailToAll,
  sendWeeklyOpportunityDigest
};