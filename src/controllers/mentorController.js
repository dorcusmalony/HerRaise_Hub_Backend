const db = require('../config/database');

// @desc    Get all verified mentors
// @route   GET /api/mentors
// @access  Public
exports.getMentors = async (req, res) => {
  try {
    const { User, MentorProfile } = db.models;
    
    const mentors = await User.findAll({
      where: { 
        role: 'mentor',
        isActive: true,
        isVerified: true 
      },
      attributes: { 
        exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] 
      },
      include: [{ model: MentorProfile }]
    });

    res.status(200).json({
      success: true,
      count: mentors.length,
      mentors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get specific mentor by ID
// @route   GET /api/mentors/:id
// @access  Public
exports.getMentorById = async (req, res) => {
  try {
    const { User, MentorProfile } = db.models;
    
    const mentor = await User.findOne({
      where: { 
        id: req.params.id,
        role: 'mentor',
        isActive: true 
      },
      attributes: { 
        exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] 
      },
      include: [{ model: MentorProfile }]
    });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    res.status(200).json({
      success: true,
      mentor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update mentor profile
// @route   PUT /api/mentors/profile
// @access  Private (Mentor only)
exports.updateMentorProfile = async (req, res) => {
  try {
    const { MentorProfile } = db.models;
    
    let mentorProfile = await MentorProfile.findOne({ 
      where: { userId: req.user.id } 
    });

    if (!mentorProfile) {
      mentorProfile = await MentorProfile.create({
        userId: req.user.id,
        ...req.body
      });
    } else {
      // Update existing profile
      await mentorProfile.update(req.body);
    }

    res.status(200).json({
      success: true,
      mentorProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify a mentor
// @route   PUT /api/mentors/:id/verify
// @access  Private (Admin only)
exports.verifyMentor = async (req, res) => {
  try {
    const { User } = db.models;
    
    const mentor = await User.findOne({
      where: { 
        id: req.params.id,
        role: 'mentor' 
      }
    });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    mentor.isVerified = true;
    mentor.verificationDate = new Date();
    await mentor.save();

    res.status(200).json({
      success: true,
      message: 'Mentor verified successfully',
      mentor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Additional controller methods will be implemented as needed

// Placeholder for mentor-mentee relationship methods
exports.getMentorMentees = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

exports.getAvailableMentors = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

exports.requestMentor = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};
