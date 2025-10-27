const db = require('../config/database');
const { Op } = require('sequelize');

// Track application
const trackApplication = async (userId, opportunityId, status, notes, appliedDate) => {
  const { UserApplication, Opportunity } = db.models;

  // Check if already tracking
  let application = await UserApplication.findOne({
    where: { userId, opportunityId }
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
      userId,
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

  return application;
};

// Get user's applications
const getMyApplications = async (userId, filters = {}) => {
  const { UserApplication, Opportunity } = db.models;
  const { status, page = 1, limit = 10 } = filters;
  
  const where = { userId };
  if (status) where.status = status;

  const offset = (page - 1) * limit;

  return await UserApplication.findAndCountAll({
    where,
    include: [{
      model: Opportunity,
      attributes: ['id', 'title', 'organization', 'type', 'applicationDeadline']
    }],
    order: [['updatedAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
};

// Update application status
const updateApplicationStatus = async (applicationId, userId, status, notes) => {
  const { UserApplication } = db.models;

  const application = await UserApplication.findOne({
    where: { id: applicationId, userId }
  });

  if (!application) return null;

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
  return application;
};

// Set reminder
const setReminder = async (applicationId, userId, reminderDate, message) => {
  const { UserApplication } = db.models;

  const application = await UserApplication.findOne({
    where: { id: applicationId, userId }
  });

  if (!application) return null;

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
  return application;
};

// Get application statistics
const getApplicationStats = async (userId) => {
  const { UserApplication } = db.models;

  const stats = await Promise.all([
    UserApplication.count({ where: { userId } }),
    UserApplication.count({ where: { userId, status: 'applied' } }),
    UserApplication.count({ where: { userId, status: 'accepted' } }),
    UserApplication.count({ where: { userId, status: 'interview' } }),
    UserApplication.count({ where: { userId, status: 'preparing' } })
  ]);

  return {
    total: stats[0],
    applied: stats[1],
    accepted: stats[2],
    interviews: stats[3],
    preparing: stats[4]
  };
};

module.exports = {
  trackApplication,
  getMyApplications,
  updateApplicationStatus,
  setReminder,
  getApplicationStats
};