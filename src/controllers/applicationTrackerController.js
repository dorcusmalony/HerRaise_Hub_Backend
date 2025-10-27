const db = require('../config/database');

// Add application to tracker
exports.trackApplication = async (req, res) => {
  try {
    const { opportunityId, status = 'interested', notes, appliedDate } = req.body;
    const { UserApplication, Opportunity } = db.models;

    // Check if already tracking this opportunity
    let application = await UserApplication.findOne({
      where: { userId: req.user.id, opportunityId }
    });

    if (application) {
      // Update existing
      const oldStatus = application.status;
      application.status = status;
      application.notes = notes || application.notes;
      if (appliedDate) application.appliedDate = appliedDate;
      
      // Add to status history
      const statusHistory = application.statusHistory || [];
      statusHistory.push({
        from: oldStatus,
        to: status,
        date: new Date(),
        notes: notes
      });
      application.statusHistory = statusHistory;
      
      await application.save();
    } else {
      // Create new tracking
      application = await UserApplication.create({
        userId: req.user.id,
        opportunityId,
        status,
        notes,
        appliedDate: appliedDate || (status === 'applied' ? new Date() : null),
        statusHistory: [{
          from: null,
          to: status,
          date: new Date(),
          notes: notes
        }]
      });
    }

    // Load with opportunity details
    await application.reload({
      include: [{ model: Opportunity }]
    });

    res.json({
      success: true,
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's tracked applications
exports.getMyApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const { UserApplication, Opportunity } = db.models;
    
    const where = { userId: req.user.id };
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { rows: applications, count } = await UserApplication.findAndCountAll({
      where,
      include: [{
        model: Opportunity,
        attributes: ['id', 'title', 'organization', 'type', 'applicationDeadline']
      }],
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const { UserApplication } = db.models;

    const application = await UserApplication.findOne({
      where: { id, userId: req.user.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const oldStatus = application.status;
    application.status = status;
    if (notes) application.notes = notes;

    // Update status history
    const statusHistory = application.statusHistory || [];
    statusHistory.push({
      from: oldStatus,
      to: status,
      date: new Date(),
      notes: notes
    });
    application.statusHistory = statusHistory;

    // Set applied date if status is 'applied'
    if (status === 'applied' && !application.appliedDate) {
      application.appliedDate = new Date();
    }

    await application.save();

    res.json({
      success: true,
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Set reminder for application
exports.setReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderDate, message } = req.body;
    const { UserApplication } = db.models;

    const application = await UserApplication.findOne({
      where: { id, userId: req.user.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.nextReminderDate = reminderDate;
    
    // Add to reminders history
    const reminders = application.reminders || [];
    reminders.push({
      date: reminderDate,
      message: message || 'Application deadline reminder',
      createdAt: new Date()
    });
    application.reminders = reminders;

    await application.save();

    res.json({
      success: true,
      message: 'Reminder set successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get application statistics
exports.getApplicationStats = async (req, res) => {
  try {
    const { UserApplication } = db.models;

    const stats = await Promise.all([
      UserApplication.count({ where: { userId: req.user.id } }),
      UserApplication.count({ where: { userId: req.user.id, status: 'applied' } }),
      UserApplication.count({ where: { userId: req.user.id, status: 'accepted' } }),
      UserApplication.count({ where: { userId: req.user.id, status: 'interview' } }),
      UserApplication.count({ where: { userId: req.user.id, status: 'preparing' } })
    ]);

    res.json({
      success: true,
      stats: {
        total: stats[0],
        applied: stats[1],
        accepted: stats[2],
        interviews: stats[3],
        preparing: stats[4]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  trackApplication: exports.trackApplication,
  getMyApplications: exports.getMyApplications,
  updateApplicationStatus: exports.updateApplicationStatus,
  setReminder: exports.setReminder,
  getApplicationStats: exports.getApplicationStats
};