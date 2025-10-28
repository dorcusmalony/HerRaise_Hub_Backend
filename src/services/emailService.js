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
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px; background-color: #ff0043; color: white;">
        <h1>Welcome to HerRaise Hub! 🎉</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #333;">Hi ${userName}! 👋</h2>
        <p>Welcome to <strong>HerRaise Hub</strong> - the platform empowering women in South Sudan!</p>
        
        <h3 style="color: #ff0043;">What you can do now:</h3>
        <ul style="line-height: 1.8;">
          <li>🎓 <strong>Explore Opportunities:</strong> Find scholarships, internships, and competitions</li>
          <li>💬 <strong>Join Discussions:</strong> Connect with other women in our forum</li>
          <li>👩🏫 <strong>Find Mentors:</strong> Get guidance from experienced professionals</li>
          <li>📚 <strong>Access Resources:</strong> Educational materials and career guidance</li>
          <li>🛡️ <strong>Safety First:</strong> Use our safety resources and reporting tools</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}" 
             style="background-color: #ff0043; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Start Exploring 🚀
          </a>
        </div>
        
        <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL}/resources" style="color: #ff0043;">resources section</a> or reach out to our community!</p>
        
        <p>Together, we rise! 💪</p>
        
        <p>Best regards,<br>
        <strong>The HerRaise Hub Team</strong></p>
      </div>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        HerRaise Hub - Empowering Women in South Sudan<br>
        <a href="${process.env.FRONTEND_URL}" style="color: #ff0043;">Visit our platform</a>
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: '🎉 Welcome to HerRaise Hub - Let\'s Empower Your Journey!',
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};