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
const sendDeadlineReminder = async (user, opportunity) => {
  const opportunityUrl = `${process.env.FRONTEND_URL}/opportunities/${opportunity.id}`;
  const deadlineDate = new Date(opportunity.applicationDeadline).toLocaleDateString();
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px; background-color: #ff6b35; color: white;">
        <h1>⏰ Deadline Reminder!</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #333;">Hi ${user.name}! 👋</h2>
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
    to: user.email,
    subject: `⏰ Reminder: ${opportunity.title} deadline in 3 days!`,
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendDeadlineReminder
};