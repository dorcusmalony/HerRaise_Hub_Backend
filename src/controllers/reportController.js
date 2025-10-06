const Report = require('../models/report');
const User = require('../models/user');

// Create a new report (public; optional auth)
exports.createReport = async (req, res) => {
  try {
    const { type, description, location, contact, extra } = req.body;

    const reporterId = req.user ? req.user.id : undefined;

    const report = await Report.create({
      reporter: reporterId,
      type,
      description,
      location,
      contact,
      metadata: {
        ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0],
        userAgent: req.get('User-Agent') || '',
        extra: extra || {}
      }
    });

    // TODO: Send notification to moderation channel/email (implement provider)
    console.log('New report created:', report._id);

    res.status(201).json({
      success: true,
      report,
      message: 'Report submitted. The team will review it shortly.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get list of reports (mentor/admin)
exports.getReports = async (req, res) => {
  try {
    const { status, type, reporter } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (reporter) filter.reporter = reporter;

    const reports = await Report.find(filter)
      .populate('reporter', 'name email profilePicture')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

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

// Get single report (owner, mentor, admin)
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name email profilePicture')
      .populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Allow owner, mentor, admin
    if (report.reporter && req.user && report.reporter._id.toString() === req.user.id) {
      return res.status(200).json({ success: true, report });
    }

    if (!req.user || (req.user.role !== 'mentor' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this report' });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update report status / assign / resolve (admin only)
exports.updateReportStatus = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (status) {
      report.status = status;
      if (status === 'resolved') report.resolvedAt = Date.now();
      if (['open', 'in-review'].includes(status)) report.resolvedAt = undefined;
    }

    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (user) report.assignedTo = assignedTo;
    }

    await report.save();

    // TODO: notify reporter/assigned moderator (email/push)
    console.log('Report updated:', report._id, 'status:', report.status);

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
