const db = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const User = db.models.User;
    const MentorProfile = db.models.MentorProfile;

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: req.user.role === 'mentor' ? [{ model: MentorProfile, as: 'mentorProfile' }] : [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const User = db.models.User;
    const { name, phoneNumber, location, dateOfBirth, interests, educationLevel, language } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePicture) {
      try {
        const publicId = user.profilePicture.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      } catch (delError) {
        console.warn('Failed to delete old profile picture:', delError.message);
      }
    }

    // Upload new image to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'herraise/profiles');

    user.profilePicture = result.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profilePicture: result.secure_url },
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.profilePicture) {
      return res.status(400).json({ success: false, message: 'No profile picture to delete' });
    }

    // Delete from Cloudinary
    try {
      const publicId = user.profilePicture.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    } catch (delError) {
      console.warn('Failed to delete from Cloudinary:', delError.message);
    }

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
      return res.status(404).json({ success: false, message: 'User not found' });
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