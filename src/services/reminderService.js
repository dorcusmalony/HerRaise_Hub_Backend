const cron = require('node-cron');
const db = require('../config/database');

// Initialize all cron jobs
const initializeCronJobs = () => {
  console.log('Initializing cron jobs...');
  
  // Check for scholarship deadlines daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const { Scholarship, ScholarshipApplication, Notification, User } = db.models;
      
      if (!Scholarship) return;
      
      // Find scholarships with deadlines in next 7 days
      const upcoming = await Scholarship.findAll({
        where: {
          deadline: {
            [db.Sequelize.Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
          },
          isActive: true
        }
      });

      for (const scholarship of upcoming) {
        // Get users who haven't applied
        const appliedUsers = await ScholarshipApplication.findAll({
          where: { scholarshipId: scholarship.id },
          attributes: ['userId']
        });
        
        const appliedUserIds = appliedUsers.map(app => app.userId);
        
        const users = await User.findAll({
          where: {
            id: { [db.Sequelize.Op.notIn]: appliedUserIds }
          },
          attributes: ['id']
        });

        // Create reminder notifications
        const notifications = users.map(user => ({
          userId: user.id,
          type: 'deadline_reminder',
          title: 'Deadline Approaching!',
          message: `${scholarship.title} deadline is in ${Math.ceil((scholarship.deadline - new Date()) / (1000 * 60 * 60 * 24))} days`,
          relatedId: scholarship.id,
          link: `/opportunities/${scholarship.id}`
        }));

        if (notifications.length > 0) {
          await Notification.bulkCreate(notifications);
        }
      }
    } catch (error) {
      console.error('Scholarship reminder service error:', error);
    }
  });
};

module.exports = { initializeCronJobs };