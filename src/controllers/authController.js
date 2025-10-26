const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { Op } = require('sequelize');

// helper: generate JWT
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}

async function getUserModel() {
  if (!db.models) {
    if (typeof db.connectDB === 'function') {
      await db.connectDB();
    } else {
      throw new Error('Database not initialized');
    }
  }
  return db.models.User;
}

// helper: normalize user object to the mentee payload shape
function formatUserForResponse(userInstance) {
  // Accept Sequelize instance or plain object
  const u = (userInstance && typeof userInstance.get === 'function') ? userInstance.get({ plain: true }) : (userInstance || {});
  const formatted = {
    id: u.id,
    name: u.name || null,
    email: u.email || null,
    role: u.role || 'mentee',
    profilePicture: u.profilePicture || null,
    language: u.language || 'en', // Default to English if undefined
    phoneNumber: u.phoneNumber || '+211900000000', // Default placeholder number
    // ensure location is an object with default city/state if empty
    location: (u.location && typeof u.location === 'object' && Object.keys(u.location).length > 0) 
      ? u.location 
      : (u.location ? (() => { try { return JSON.parse(u.location); } catch(e){ return { city: 'Unknown', state: 'Unknown' }; } })() 
      : { city: 'Unknown', state: 'Unknown' }),
    // dateOfBirth normalized to YYYY-MM-DD if present, default to 18 years ago
    dateOfBirth: u.dateOfBirth ? (new Date(u.dateOfBirth).toISOString().split('T')[0]) : 
      (new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]),
    interests: Array.isArray(u.interests) && u.interests.length > 0 
      ? u.interests 
      : (u.interests && typeof u.interests === 'string' 
        ? u.interests.split(',').map(s => s.trim()).filter(Boolean) 
        : ['personal growth', 'career development']),
    educationLevel: u.educationLevel || 'secondary',
    
    // Add mentor-specific fields when applicable
    ...(u.role === 'mentor' ? {
      yearsOfExperience: u.yearsOfExperience || 0,
      isVerified: u.isVerified || false,
      verificationDate: u.verificationDate,
      mentorProfile: u.MentorProfile || null
    } : {})
  };
  return formatted;
}

const { sendPasswordResetEmail } = require('../services/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Accept extra profile fields
    const {
      name,
      email,
      password,
      role,
      language,
      phoneNumber,
      location,
      dateOfBirth,
      interests,
      educationLevel,
      // Mentor-specific fields
      yearsOfExperience,
      expertise,
      bio,
      professionalTitle,
      organization,
      linkedinProfile,
      educationHistory,
      workHistory
    } = req.body;

    // Basic validation - prevent nulls in critical fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required fields' 
      });
    }

    const User = await getUserModel();

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // sanitize interests into array - provide default if missing
    let interestsArr = ['personal growth', 'career development'];
    if (Array.isArray(interests) && interests.length > 0) {
      interestsArr = interests.map(i => String(i).trim()).filter(Boolean);
    } else if (typeof interests === 'string' && interests.trim()) {
      interestsArr = interests.split(',').map(i => i.trim()).filter(Boolean);
    }

    // parse location (allow object or JSON string) - provide default if missing
    let parsedLocation = { city: 'Unknown', state: 'Unknown' };
    if (location) {
      if (typeof location === 'object' && Object.keys(location).length > 0) {
        parsedLocation = location;
      } else {
        try { 
          const parsed = JSON.parse(location);
          if (parsed && typeof parsed === 'object') parsedLocation = parsed;
        } catch (e) { /* Use default */ }
      }
    }

    // Default date of birth (18 years ago) if not provided
    const defaultDOB = new Date();
    defaultDOB.setFullYear(defaultDOB.getFullYear() - 18);

    // Validate language input
    const validLanguages = ['en', 'ar', 'juba-ar'];
    const userLanguage = language && validLanguages.includes(language) ? language : 'en';

    // prepare user data with sensible defaults
    const userData = {
      name,
      email,
      password,
      role: role || 'mentee',
      language: userLanguage,
      phoneNumber: phoneNumber || '+211900000000',
      location: parsedLocation,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : defaultDOB,
      interests: interestsArr,
      educationLevel: educationLevel || 'secondary',
      // Add mentor-specific fields if role is mentor
      ...(role === 'mentor' ? {
        yearsOfExperience: yearsOfExperience || 0,
        isVerified: false // New mentors start unverified
      } : {})
    };

    console.log('Creating user with data:', {
      ...userData, 
      password: '[REDACTED]' // Don't log passwords
    });
    
    const user = await User.create(userData);

    // If registering as mentor, create mentor profile
    if (role === 'mentor') {
      const { MentorProfile } = db.models;
      const mentorProfile = await MentorProfile.create({
        userId: user.id,
        expertise: Array.isArray(expertise) ? expertise : (expertise ? [expertise] : []),
        bio: bio || `Professional mentor with ${yearsOfExperience || 0} years of experience.`,
        professionalTitle: professionalTitle || 'Professional Mentor',
        organization: organization || '',
        linkedinProfile: linkedinProfile || '',
        educationHistory: Array.isArray(educationHistory) ? educationHistory : [],
        workHistory: Array.isArray(workHistory) ? workHistory : []
      });
      
      // Attach to user object for response
      user.MentorProfile = mentorProfile;
    }

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: formatUserForResponse(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const User = await getUserModel();

    // Try to fetch user including password for authentication
    const user = await User.findOne({
      where: { email },
      attributes: { include: ['password'] }
    });

    // If a user was found but password wasn't returned for some reason, attempt a reload and raw-check
    if (user && (user.password === undefined || user.password === null)) {
      console.warn(`User record found for ${email} but password field missing on Sequelize instance — attempting fallback raw query`);

      // Attempt a raw query to inspect the DB row for the password column (do not log the hash)
      try {
        const sequelize = db.sequelize || (await db.connectDB() && db.sequelize);
        const { QueryTypes } = require('sequelize');

        // Try multiple query variants to accommodate different table-name casing/quoting
        const queries = [
          'SELECT "password" FROM "Users" WHERE email = :email LIMIT 1',
          'SELECT password FROM users WHERE email = :email LIMIT 1',
          'SELECT password FROM "users" WHERE email = :email LIMIT 1'
        ];

        let row = null;
        for (const q of queries) {
          try {
            const rows = await sequelize.query(q, { replacements: { email }, type: QueryTypes.SELECT });
            if (Array.isArray(rows) && rows.length > 0) {
              row = rows[0];
              console.log(`Raw query succeeded using query variant: ${q.split('FROM')[1].trim().split(' ')[0]}`);
              break;
            }
          } catch (qErr) {
            // Try next variant silently but log at debug level
            console.warn(`Raw query variant failed (${q.split('FROM')[1].trim().split(' ')[0]}):`, qErr.message);
            continue;
          }
        }

        if (row && row.password) {
          console.log(`Password hash exists in DB for ${email}; attaching to instance for comparison.`);
          // Attach the hash to the Sequelize instance so comparePassword can run
          user.password = row.password;
        } else {
          console.error(`Password column missing or NULL for ${email}. This may indicate tables were not created or registration did not save a password.`);
          return res.status(500).json({
            success: false,
            message: 'Account found but password data missing. Ensure the database tables exist and registrations correctly save passwords.'
          });
        }
      } catch (rawErr) {
        console.error('Raw DB query failed while checking password column:', rawErr && rawErr.message);
        return res.status(500).json({ success: false, message: 'Internal error while verifying account. Contact support.' });
      }
    }

    if (!user) {
      // Do not reveal whether email exists — keep generic for security
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Ensure comparePassword exists on the instance
    if (typeof user.comparePassword !== 'function') {
      console.error('comparePassword not available on User model instance for', email);
      return res.status(500).json({ success: false, message: 'Authentication not available. Contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    // Return the same mentee profile shape as register
    res.status(200).json({
      success: true,
      token,
      user: formatUserForResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const User = await getUserModel();
    const { MentorProfile } = db.models;
    
    // Include mentor profile for mentors
    const include = [];
    if (req.user.role === 'mentor') {
      include.push({ model: MentorProfile });
    }
    
    const user = await User.findByPk(req.user.id, { 
      attributes: { exclude: ['password'] },
      include
    });
    
    res.status(200).json({ success: true, user: formatUserForResponse(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const User = await getUserModel();

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email'
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken, user.name);

    res.status(200).json({
      success: true,
      message: 'Password reset token sent',
      resetToken // remove in production
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const User = await getUserModel();

    const user = await User.findOne({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    // Generate new token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const User = await getUserModel();

    const user = await User.findByPk(req.user.id, { attributes: { include: ['password'] } });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};