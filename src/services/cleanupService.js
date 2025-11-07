const cron = require('node-cron');
const db = require('../config/database');
const { Op } = require('sequelize');

// @desc    Delete scholarships older than 30 days
const cleanupOldScholarships = async () => {
  try {
    const { Scholarship } = db.models;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedCount = await Scholarship.destroy({
      where: {
        createdAt: {
          [Op.lt]: thirtyDaysAgo
        }
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${deletedCount} scholarships older than 30 days`);
    }
  } catch (error) {
    console.error('Error cleaning up old scholarships:', error);
  }
};

// @desc    Start cleanup jobs
const startCleanupJobs = () => {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', cleanupOldScholarships, {
    timezone: process.env.TZ || 'UTC'
  });
  
  console.log('✅ Cleanup service started - scholarships will be deleted after 30 days');
};

module.exports = {
  cleanupOldScholarships,
  startCleanupJobs
};