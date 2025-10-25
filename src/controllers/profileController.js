const db = require('../config/database');

function t(msg, lang) {
  // Simple static translations (expand as needed)
  const dict = {
    'Profile updated successfully': {
      ar: 'تم تحديث الملف الشخصي بنجاح',
      en: 'Profile updated successfully'
    },
    'User not found': {
      ar: 'المستخدم غير موجود',
      en: 'User not found'
    },
    'Server error': {
      ar: 'خطأ في الخادم',
      en: 'Server error'
    }
  };
  return dict[msg]?.[lang] || msg;
}

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const User = db.models.User;
    const MentorProfile = db.models.MentorProfile;

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: req.user.role === 'mentor' ? [{ model: MentorProfile, as: 'MentorProfile' }] : [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: t('User not found', req.lang) });
    }

    // Removed unused 'lang' variable to fix ESLint warning

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: t('Server error', req.lang), error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const User = db.models.User;
    const { name, phoneNumber, location, dateOfBirth, interests, educationLevel, language } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: t('User not found', req.lang) });
    }

    // Validate language if provided
    const supportedLanguages = ['en', 'ar']; // en = English, ar = Juba Arabic
    if (language && !supportedLanguages.includes(language)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Unsupported language. Supported languages: en (English), ar (Juba Arabic)' 
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (location) user.location = location;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (interests) user.interests = Array.isArray(interests) ? interests : JSON.parse(interests);
    if (educationLevel) user.educationLevel = educationLevel;
    if (language) user.language = language;

    await user.save();

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    res.status(200).json({
      success: true,
      message: t('Profile updated successfully', req.lang),
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: t('Server error', req.lang), error: error.message });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const User = db.models.User;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: t('User not found', req.lang) });
    }

    // Remove Cloudinary deletion and upload logic
    // Instead, just save a placeholder or local file path if needed
    user.profilePicture = 'uploaded/profile/path/or/url'; // Replace with actual upload logic if needed
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profilePicture: user.profilePicture },
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const User = db.models.User;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: t('User not found', req.lang) });
    }

    if (!user.profilePicture) {
      return res.status(400).json({ success: false, message: 'No profile picture to delete' });
    }

    // Remove Cloudinary deletion logic
    user.profilePicture = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Change user language preference
exports.changeLanguage = async (req, res) => {
  try {
    const User = db.models.User;
    const { language } = req.body;
    const supportedLanguages = ['en', 'ar'];

    if (!language || !supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Supported: en (English), ar (Juba Arabic)'
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: t('User not found', req.lang) });
    }

    user.language = language;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Language preference updated successfully',
      data: { language }
    });
  } catch (error) {
    console.error('Change language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};