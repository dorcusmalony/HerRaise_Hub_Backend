// ADD THIS FUNCTION to opportunityTrackingController.js

// Get user's pending applications
exports.getPendingApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { OpportunityInteraction, Opportunity } = db.models;
    
    const pendingApps = await OpportunityInteraction.findAll({
      where: { 
        userId,
        applicationStatus: 'pending'
      },
      include: [{
        model: Opportunity,
        attributes: ['id', 'title', 'organization', 'applicationDeadline', 'type']
      }],
      order: [['updatedAt', 'DESC']]
    });

    const applicationsWithDaysLeft = pendingApps.map(app => {
      const deadline = new Date(app.Opportunity.applicationDeadline);
      const now = new Date();
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...app.toJSON(),
        daysRemaining: daysLeft,
        isUrgent: daysLeft <= 3
      };
    });

    res.json({
      success: true,
      pendingApplications: applicationsWithDaysLeft,
      count: applicationsWithDaysLeft.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
