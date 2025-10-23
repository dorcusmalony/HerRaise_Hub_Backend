const db = require('../config/database');
const { broadcast } = require('../services/socketService');

// Get all scholarships/opportunities
exports.getScholarships = async (req, res) => {
  try {
    const { Scholarship, User } = db.models;
    const { type, limit = 20 } = req.query;
    
    const where = { isActive: true };
    if (type) where.type = type;

    const scholarships = await Scholarship.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ success: true, scholarships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new scholarship/opportunity
exports.createScholarship = async (req, res) => {
  try {
    const { Scholarship, User, Notification } = db.models;
    const scholarship = await Scholarship.create({
      ...req.body,
      postedBy: req.user.id
    });

    // Notify all users about new opportunity
    const users = await User.findAll({ attributes: ['id'] });
    const notifications = users.map(user => ({
      userId: user.id,
      type: 'scholarship',
      title: 'New Opportunity Available!',
      message: `${scholarship.title} - ${scholarship.type}`,
      relatedId: scholarship.id,
      link: `/opportunities/${scholarship.id}`
    }));

    await Notification.bulkCreate(notifications);

    // Send real-time notification
    broadcast('new_opportunity', {
      id: scholarship.id,
      title: scholarship.title,
      type: scholarship.type,
      message: `New ${scholarship.type} available: ${scholarship.title}`
    });

    res.status(201).json({ success: true, scholarship });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Apply for scholarship
exports.applyForScholarship = async (req, res) => {
  try {
    const { ScholarshipApplication } = db.models;
    const { scholarshipId } = req.params;
    const { notes } = req.body;

    const existing = await ScholarshipApplication.findOne({
      where: { scholarshipId, userId: req.user.id }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }

    const application = await ScholarshipApplication.create({
      scholarshipId,
      userId: req.user.id,
      notes,
      status: 'submitted'
    });

    res.status(201).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user applications
exports.getUserApplications = async (req, res) => {
  try {
    const { ScholarshipApplication, Scholarship } = db.models;
    
    const applications = await ScholarshipApplication.findAll({
      where: { userId: req.user.id },
      include: [{ model: Scholarship }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const { Notification } = db.models;
    
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { Notification } = db.models;
    
    await Notification.update(
      { isRead: true },
      { where: { id: req.params.id, userId: req.user.id } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};