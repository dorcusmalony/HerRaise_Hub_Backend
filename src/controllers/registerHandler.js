const crypto = require('crypto');
const db = require('../config/database');
const { calculateAge } = require('../utils/ageHelper');
const { sendVerificationEmail } = require('../services/emailService');

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (password.length > 128) errors.push('Password must be less than 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) errors.push('Password must contain at least one special character');
  const commonPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123', 'password123', 'admin', 'letmein', 'welcome', 'monkey'];
  if (commonPasswords.includes(password.toLowerCase())) errors.push('Password is too common');
  return { isValid: errors.length === 0, errors };
}

async function handleRegister(req, res) {
  try {
    const {
      name, email, password, role, language, phoneNumber, location,
      dateOfBirth, interests, educationLevel, guardianName,
      yearsOfExperience, expertise, bio, professionalTitle, organization, linkedinProfile, educationHistory, workHistory
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: 'Password requirements not met', errors: passwordValidation.errors });
    }

    const User = db.models.User;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    let interestsArr = ['personal growth', 'career development'];
    if (Array.isArray(interests) && interests.length > 0) {
      interestsArr = interests.map(i => String(i).trim()).filter(Boolean);
    }

    let parsedLocation = { city: 'Unknown', state: 'Unknown' };
    if (location && typeof location === 'object' && Object.keys(location).length > 0) {
      parsedLocation = location;
    }

    const defaultDOB = new Date();
    defaultDOB.setFullYear(defaultDOB.getFullYear() - 18);
    const dob = dateOfBirth ? new Date(dateOfBirth) : defaultDOB;
    const age = calculateAge(dob);
    const isMinor = age < 18;

    if (isMinor && !guardianName) {
      return res.status(400).json({ success: false, message: 'Guardian name is required for users under 18 years old' });
    }

    const validLanguages = ['en', 'ar', 'juba-ar'];
    const userLanguage = language && validLanguages.includes(language) ? language : 'en';

    const userData = {
      name, email, password,
      role: role || 'mentee',
      language: userLanguage,
      phoneNumber: phoneNumber || '+211900000000',
      location: parsedLocation,
      dateOfBirth: dob,
      interests: interestsArr,
      educationLevel: educationLevel || 'secondary',
      isMinor,
      guardianName: isMinor ? guardianName : null,
      parentalConsentGiven: isMinor,
      parentalConsentDate: isMinor ? new Date() : null,
      ...(role === 'mentor' ? { yearsOfExperience: yearsOfExperience || 0, isVerified: false } : {})
    };

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    userData.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    userData.emailVerificationExpires = verificationExpires;
    userData.emailVerified = false;

    const user = await User.create(userData);

    if (role === 'mentor') {
      const { MentorProfile } = db.models;
      await MentorProfile.create({
        userId: user.id,
        expertise: Array.isArray(expertise) ? expertise : (expertise ? [expertise] : []),
        bio: bio || `Professional mentor with ${yearsOfExperience || 0} years of experience.`,
        professionalTitle: professionalTitle || 'Professional Mentor',
        organization: organization || '',
        linkedinProfile: linkedinProfile || '',
        educationHistory: Array.isArray(educationHistory) ? educationHistory : [],
        workHistory: Array.isArray(workHistory) ? workHistory : []
      });
    }

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken, user.id);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
      return res.status(500).json({ success: false, message: 'Failed to send verification email' });
    }

    res.status(201).json({
      success: true,
      message: isMinor 
        ? 'Registration successful. Parent/guardian consent has been recorded. Please verify your email.'
        : 'Registration successful. Please check your email to verify your account.',
      email: user.email,
      requiresVerification: true,
      isMinor,
      guardianName: isMinor ? guardianName : null
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { handleRegister };
