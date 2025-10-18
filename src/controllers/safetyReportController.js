const db = require('../config/database');
const nodemailer = require('nodemailer');

// Helper to send email notifications
async function sendSafetyAlert(report) {
  try {
    // Check if email config is available
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email configuration missing. Safety alert not sent.');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Prepare report details for email
    const reportDetails = {
      id: report.id,
      type: report.type,
      urgency: report.urgencyLevel || 'medium',
      description: report.description,
      reportedAt: report.createdAt,
      reporterId: report.reporterId || 'Anonymous'
    };

    // Send email to safety team
    await transporter.sendMail({
      from: `"HerRaise Safety" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.SAFETY_EMAIL || process.env.EMAIL_USER,
      subject: `[${reportDetails.urgency.toUpperCase()}] Safety Report: ${reportDetails.type}`,
      html: `
        <h2>Safety Report Filed</h2>
        <p><strong>Type:</strong> ${reportDetails.type}</p>
        <p><strong>Urgency:</strong> ${reportDetails.urgency}</p>
        <p><strong>Description:</strong> ${reportDetails.description}</p>
        <p><strong>Submitted:</strong> ${new Date(reportDetails.reportedAt).toLocaleString()}</p>
        <p><strong>Reporter:</strong> ${reportDetails.reporterId !== 'Anonymous' ? 'Registered user' : 'Anonymous'}</p>
        <p><a href="${process.env.ADMIN_URL || 'http://localhost:3000'}/admin/reports/${reportDetails.id}">View Report Details</a></p>
      `
    });

    console.log(`Email notification sent for report: ${report.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send safety alert email:', error);
    return false;
  }
}

// @desc    Submit a safety report
// @route   POST /api/reports/safety
// @access  Public (allows anonymous)
const submitSafetyReport = async (req, res) => {
  try {
    const { Report } = db.models;
    
    // Get report details
    const { 
      type, 
      description, 
      location, 
      contact, 
      urgencyLevel = 'medium',
      isAnonymous = false,
      relatedUserIds = []
    } = req.body;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type and description are required for safety reports'
      });
    }

    // Validate report type
    const validTypes = ['harassment', 'abuse', 'technical', 'unsafe', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Report type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Set reporter ID if authenticated and not anonymous
    const reporterId = (!isAnonymous && req.user) ? req.user.id : null;

    // Create the report
    const report = await Report.create({
      type,
      description,
      location,
      contact,
      urgencyLevel,
      isAnonymous,
      reporterId,
      relatedUserIds: Array.isArray(relatedUserIds) ? relatedUserIds : [],
      metadata: {
        ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0],
        userAgent: req.get('User-Agent') || '',
        extra: req.body.extra || {}
      }
    });

    // Send notification for high and critical urgency
    if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
      const emailSent = await sendSafetyAlert(report);
      if (emailSent) {
        report.notifiedAt = new Date();
        await report.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Safety report submitted successfully. Our team will review it shortly.',
      reportId: report.id
    });
  } catch (error) {
    console.error('Safety report submission error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your report. Please try again.'
    });
  }
};

// @desc    Get all safety reports
// @route   GET /api/reports/safety
// @access  Private (Admin only)
const getSafetyReports = async (req, res) => {
  try {
    const { Report, User } = db.models;
    
    // Filter options
    const { 
      type, 
      status = 'open',
      urgencyLevel
    } = req.query;
    
    const whereClause = {};
    if (type) whereClause.type = type;
    if (status !== 'all') whereClause.status = status;
    if (urgencyLevel) whereClause.urgencyLevel = urgencyLevel;
    
    // Get reports with reporter info
    const reports = await Report.findAll({
      where: whereClause,
      order: [
        ['urgencyLevel', 'DESC'], // Critical first
        ['createdAt', 'DESC']     // Newest first
      ],
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ]
    });
    
    res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update safety report status
// @route   PUT /api/reports/safety/:id
// @access  Private (Admin only)
const updateSafetyReport = async (req, res) => {
  try {
    const { Report } = db.models;
    const { id } = req.params;
    const { status, assignedToId, notes } = req.body;
    
    const report = await Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Safety report not found'
      });
    }
    
    // Update fields
    if (status) report.status = status;
    if (assignedToId) report.assignedToId = assignedToId;
    if (notes) {
      report.metadata = {
        ...report.metadata,
        adminNotes: [
          ...(report.metadata.adminNotes || []),
          { note: notes, addedBy: req.user.id, addedAt: new Date() }
        ]
      };
    }
    
    // Mark as resolved if status is 'resolved'
    if (status === 'resolved' && !report.resolvedAt) {
      report.resolvedAt = new Date();
    }
    
    await report.save();
    
    res.status(200).json({
      success: true,
      message: 'Safety report updated successfully',
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  submitSafetyReport,
  getSafetyReports,
  updateSafetyReport
};

