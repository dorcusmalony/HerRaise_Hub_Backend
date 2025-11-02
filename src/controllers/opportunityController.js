const db = require('../config/database');
const { notifyApplicationStatus, broadcast } = require('../services/socketService');

function t(msg, lang) {
  const dict = {
    'Opportunity not found': {
      ar: 'الفرصة غير موجودة',
      en: 'Opportunity not found'
    },
    'Opportunity deleted successfully': {
      ar: 'تم حذف الفرصة بنجاح',
      en: 'Opportunity deleted successfully'
    }
  };
  return dict[msg]?.[lang] || msg;
}

// @desc    Get all opportunities with filters
// @route   GET /api/opportunities
// @access  Public
exports.getOpportunities = async (req, res) => {
  try {
    const { filter, search, deadline } = req.query;
    const { Opportunity } = db.models;
    
    const whereClause = { isActive: true };
    if (filter && filter !== 'all') {
      whereClause.type = filter;
    }
    if (deadline === 'active') {
      whereClause.applicationDeadline = {
        [db.Sequelize.Op.gte]: new Date()
      };
    }

    const opportunities = await Opportunity.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: opportunities.length,
      opportunities
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single opportunity
// @route   GET /api/opportunities/:id
// @access  Public
exports.getOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Increment view count
    opportunity.views += 1;
    await opportunity.save();

    res.status(200).json({
      success: true,
      opportunity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create opportunity
// @route   POST /api/opportunities
// @access  Private (Admin/Mentor)
exports.createOpportunity = async (req, res) => {
  try {
    const { Opportunity } = db.models;
    const opportunityData = {
      ...req.body,
      creatorId: req.user.id,
      isActive: true
    };

    const opportunity = await Opportunity.create(opportunityData);
    
    // Emit notification for new opportunity
    broadcast('notification', {
      type: 'opportunity_update',
      title: 'New Opportunity!',
      message: `${opportunity.title} (${opportunity.type}) was just posted.`,
      opportunityId: opportunity.id
    });

    res.status(201).json({
      success: true,
      opportunity
    });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update opportunity
// @route   PUT /api/opportunities/:id
// @access  Private (Admin/Creator)
exports.updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Check if user is admin or creator
    if (req.user.role !== 'admin' && opportunity.creatorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this opportunity'
      });
    }

    Object.assign(opportunity, req.body);
    await opportunity.save();

    // Emit notification for updated opportunity
    broadcast('notification', {
      type: 'opportunity_update',
      title: 'Opportunity Updated',
      message: `${opportunity.title} (${opportunity.type}) was updated.`,
      opportunityId: opportunity.id
    });

    res.status(200).json({
      success: true,
      opportunity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private (Admin/Creator)
exports.deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Check if user is admin or creator
    if (req.user.role !== 'admin' && opportunity.creatorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this opportunity'
      });
    }

    opportunity.isActive = false;
    await opportunity.save();

    res.status(200).json({
      success: true,
      message: t('Opportunity deleted successfully', req.lang)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: t('Server error', req.lang),
      error: error.message
    });
  }
};

// @desc    Apply to opportunity
// @route   POST /api/opportunities/:id/apply
// @access  Private
exports.applyToOpportunity = async (req, res) => {
  try {
    const { Application } = db.models;
    const { applicationData, documents } = req.body;

    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Check deadline
    if (opportunity.applicationDeadline && new Date(opportunity.applicationDeadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      where: {
        userId: req.user.id,
        opportunityId: req.params.id
      }
    });

    if (existingApplication && existingApplication.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this opportunity'
      });
    }

    // Create or update application
    const application = existingApplication || await Application.create({
      userId: req.user.id,
      opportunityId: req.params.id,
      status: 'submitted',
      applicationData: applicationData || {},
      documents: documents || [],
      submittedAt: new Date(),
      statusHistory: [{
        status: 'submitted',
        changedAt: new Date(),
        changedBy: req.user.id
      }]
    });

    if (existingApplication) {
      application.status = 'submitted';
      application.applicationData = applicationData || {};
      application.documents = documents || [];
      application.submittedAt = new Date();
      application.statusHistory.push({
        status: 'submitted',
        changedAt: new Date(),
        changedBy: req.user.id
      });
      await application.save();
    }

    // Update opportunity applicants list
    if (!opportunity.applicants.includes(req.user.id)) {
      opportunity.applicants.push(req.user.id);
      await opportunity.save();
    }

    // Load opportunity details for notification
    await application.reload({ include: [{ model: db.models.Opportunity }] });
    
    // Emit real-time notification to user
    notifyApplicationStatus(req.user.id, application);

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my applications
// @route   GET /api/opportunities/my-applications
// @access  Private
exports.getMyApplications = async (req, res) => {
  try {
    const { Application, Opportunity } = db.models;

    const applications = await Application.findAll({
      where: { userId: req.user.id },
      include: [{ 
        model: Opportunity, 
        attributes: ['id', 'title', 'type', 'organization', 'applicationDeadline'] 
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get application details
// @route   GET /api/opportunities/applications/:id
// @access  Private
exports.getApplication = async (req, res) => {
  try {
    const { Application, Opportunity, User } = db.models;

    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Opportunity },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && application.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.status(200).json({
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

// @desc    Update application status (Admin only)
// @route   PUT /api/opportunities/applications/:id/status
// @access  Private (Admin)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { Application, Opportunity, User } = db.models;
    const { status, notes } = req.body;

    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Opportunity },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.status = status;
    application.notes = notes || application.notes;
    application.reviewedAt = new Date();
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user.id,
      notes
    });

    await application.save();
    
    // Emit real-time notification to applicant
    notifyApplicationStatus(application.userId, application);

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

