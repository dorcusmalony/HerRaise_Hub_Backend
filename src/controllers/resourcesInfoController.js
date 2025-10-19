const db = require('../config/database');

// @desc    Get legal advice information
// @route   GET /api/safety-resources/legal-advice
// @access  Public
exports.getLegalAdvice = async (_req, res) => {
  try {
    const legalAdvice = {
      general: {
        title: 'Your Rights Under South Sudan Law',
        sections: [
          {
            title: 'Workplace Harassment',
            content: 'Under the Labor Act, you have the right to a safe workplace free from harassment and discrimination.',
            action: 'Document all incidents with dates, times, and witnesses. Report to HR or labor authorities.'
          },
          {
            title: 'Domestic Violence',
            content: 'The Protection Against Domestic Violence Act protects you from abuse in domestic settings.',
            action: 'You can obtain a protection order from magistrate courts. Emergency shelter available.'
          },
          {
            title: 'Sexual Harassment',
            content: 'Sexual harassment is a criminal offense punishable under the Penal Code.',
            action: 'Report to police immediately. Medical examination within 72 hours recommended.'
          },
          {
            title: 'Discrimination',
            content: 'The Constitution guarantees equal rights and prohibits discrimination based on gender.',
            action: 'File a complaint with the Human Rights Commission or seek legal representation.'
          }
        ]
      },
      emergencySteps: [
        'Ensure your immediate safety first',
        'Preserve evidence (photos, messages, medical records)',
        'Report to authorities or trusted person',
        'Seek medical attention if needed',
        'Document everything with dates and details'
      ],
      emergencyContacts: {
        police: '777',
        crisisHotline: '+211 XXX XXX XXX', // Update with real number
        legalAid: '+211 XXX XXX XXX'
      }
    };

    res.status(200).json({
      success: true,
      legalAdvice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get report types with detailed guidance
// @route   GET /api/safety-resources/report-types
// @access  Public
exports.getReportTypes = async (_req, res) => {
  try {
    const reportTypes = {
      types: [
        {
          value: 'harassment',
          label: 'Harassment',
          description: 'Sexual, verbal, or workplace harassment',
          examples: ['Unwanted advances', 'Inappropriate comments', 'Sexual harassment']
        },
        {
          value: 'bullying_cyberbullying',
          label: 'Bullying/Cyberbullying',
          description: 'Online or in-person bullying behavior',
          examples: ['Threatening messages', 'Hate speech', 'Exclusion']
        },
        {
          value: 'inappropriate_content',
          label: 'Inappropriate Content',
          description: 'Offensive or harmful content on platform',
          examples: ['Explicit images', 'Hateful posts', 'Violent content']
        },
        {
          value: 'unsafe_situation',
          label: 'Unsafe Situation',
          description: 'Physical danger or threatening environment',
          examples: ['Stalking', 'Threats', 'Dangerous location']
        },
        {
          value: 'legal_advice',
          label: 'Need Legal Advice',
          description: 'Seeking legal guidance or support',
          examples: ['Know your rights', 'Legal consultation', 'Next steps']
        },
        {
          value: 'other',
          label: 'Other Safety Concern',
          description: 'Any other safety or security issue',
          examples: ['General safety', 'Platform security', 'Privacy concerns']
        }
      ],
      urgencyLevels: [
        {
          value: 'critical',
          label: 'Critical (Immediate danger)',
          description: 'You are in immediate danger',
          responseTime: 'Within 1 hour'
        },
        {
          value: 'high',
          label: 'High (Needs quick attention)',
          description: 'Serious issue requiring prompt response',
          responseTime: 'Within 4 hours'
        },
        {
          value: 'medium',
          label: 'Medium (Important but not urgent)',
          description: 'Important issue that can wait',
          responseTime: 'Within 24 hours'
        },
        {
          value: 'low',
          label: 'Low (General inquiry)',
          description: 'General questions or concerns',
          responseTime: 'Within 3 days'
        }
      ],
      locations: [
        'Forum/Discussion',
        'Private Messages',
        'Mentor Session',
        'Outside Platform',
        'Other'
      ]
    };

    res.status(200).json({
      success: true,
      data: reportTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit detailed safety report (main form)
// @route   POST /api/safety-resources/report
// @access  Public (allows anonymous)
exports.submitSafetyReport = async (req, res) => {
  try {
    const { Report } = db.models;
    
    const { 
      reportType,
      urgencyLevel,
      location,
      description,
      evidenceUrl,
      relatedUserIds,
      contactPreference,
      contactEmail,
      contactPhone,
      isAnonymous,
      acknowledged
    } = req.body;

    // Validation
    if (!reportType || !description || !urgencyLevel) {
      return res.status(400).json({
        success: false,
        message: 'Report type, description, and urgency level are required'
      });
    }

    if (!acknowledged) {
      return res.status(400).json({
        success: false,
        message: 'You must acknowledge the confidentiality terms'
      });
    }

    // Create comprehensive report
    const report = await Report.create({
      type: reportType,
      description,
      status: 'pending',
      urgencyLevel,
      isAnonymous: isAnonymous || (contactPreference === 'anonymous'),
      reporterId: (req.user && !isAnonymous) ? req.user.id : null,
      location: location || '',
      contact: contactPreference === 'email' ? contactEmail : 
               contactPreference === 'phone' ? contactPhone : '',
      relatedUserIds: Array.isArray(relatedUserIds) ? relatedUserIds : [],
      metadata: {
        ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0],
        userAgent: req.get('User-Agent') || '',
        timestamp: new Date(),
        formData: {
          reportLocation: location,
          evidenceUrl,
          contactPreference,
          acknowledgedTerms: acknowledged
        }
      }
    });

    // Auto-notify for critical/high urgency
    if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
      console.log(`🚨 ${urgencyLevel.toUpperCase()} PRIORITY: Report ${report.id} - ${reportType}`);
      // TODO: Send email/SMS to safety team
    }

    // Prepare response based on urgency
    const responseTime = {
      critical: 'within 1 hour',
      high: 'within 4 hours',
      medium: 'within 24 hours',
      low: 'within 3 days'
    };

    res.status(201).json({
      success: true,
      message: 'Your safety report has been submitted successfully.',
      reportId: report.id,
      expectedResponse: responseTime[urgencyLevel] || 'soon',
      nextSteps: [
        'Your report has been received and logged',
        `Our safety team will review it ${responseTime[urgencyLevel]}`,
        contactPreference === 'anonymous' ? 
          'No follow-up contact will be made per your request' :
          'We will contact you using your preferred method',
        'You can track your report status in "My Reports"'
      ],
      ...(urgencyLevel === 'critical' && {
        emergencyInfo: {
          message: 'If you are in immediate danger, please contact:',
          police: '777',
          crisisHotline: '+211 XXX XXX XXX'
        }
      })
    });
  } catch (error) {
    console.error('Safety report submission error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your report. Please try again or call 777 if urgent.'
    });
  }
};

// @desc    Quick emergency alert
// @route   POST /api/safety-resources/emergency-alert
// @access  Public
exports.sendEmergencyAlert = async (req, res) => {
  try {
    const { Report } = db.models;
    const { description, location } = req.body;

    const report = await Report.create({
      type: 'unsafe_situation',
      description: description || 'Emergency alert triggered',
      status: 'pending',
      urgencyLevel: 'critical',
      isAnonymous: req.user ? false : true,
      reporterId: req.user?.id || null,
      location: location || '',
      metadata: {
        ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0],
        timestamp: new Date(),
        alertType: 'emergency_button'
      }
    });

    console.log(`🚨 EMERGENCY ALERT: Report ${report.id}`);

    res.status(201).json({
      success: true,
      message: 'Emergency alert sent. Help is on the way.',
      reportId: report.id,
      emergencyContacts: {
        police: '777',
        crisisHotline: '+211 XXX XXX XXX'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send alert. Call 777 immediately if in danger.'
    });
  }
};
