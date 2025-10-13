const UserActivity = require('../models/UserActivity');
const Badge = require('../models/badges');
const User = require('../models/user');

// @desc    Get user activity
// @route   GET /api/activity/me
// @access  Private
exports.getMyActivity = async (req, res) => {
  try {
    // Remove Mongoose .populate chain; model wrapper returns activity with badges JSONB
    let activity = await UserActivity.findOne({ user: req.user.id });

    if (!activity) {
      activity = await UserActivity.create({ user: req.user.id });
    }

    res.status(200).json({
      success: true,
      activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get activity statistics
// @route   GET /api/activity/stats
// @access  Private
exports.getActivityStats = async (req, res) => {
  try {
    const activity = await UserActivity.findOne({ user: req.user.id });

    if (!activity) {
      return res.status(200).json({
        success: true,
        stats: {
          totalTimeSpent: 0,
          currentStreak: 0,
          longestStreak: 0,
          badgesEarned: 0,
          dailyAverage: 0
        }
      });
    }

    // Calculate last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = activity.dailyActivity.filter(
      day => day.date >= sevenDaysAgo
    );

    const totalRecentMinutes = recentActivity.reduce(
      (sum, day) => sum + day.duration, 0
    );

    const dailyAverage = recentActivity.length > 0 
      ? Math.round(totalRecentMinutes / recentActivity.length) 
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalTimeSpent: activity.totalTimeSpent,
        currentStreak: activity.streak.current,
        longestStreak: activity.streak.longest,
        badgesEarned: activity.badges.length,
        dailyAverage,
        last7Days: recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check and award badges
// @route   POST /api/activity/check-badges
// @access  Private
exports.checkAndAwardBadges = async (req, res) => {
  try {
    const activity = await UserActivity.findOne({ user: req.user.id });
    const user = await User.findById(req.user.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Badge.find returns Sequelize instances
    const badges = await Badge.find();
    const newBadges = [];

    for (const badgeInstance of badges) {
      // Normalize badge object/fields for compatibility
      const badgeId = badgeInstance.id || badgeInstance._id;
      const criteria = badgeInstance.criteria || {};
      const points = badgeInstance.points || 0;

      // Check if user already has this badge (activity.badges stored as array of { badgeId, earnedAt })
      const hasBadge = (activity.badges || []).some(
        b => String(b.badgeId) === String(badgeId)
      );

      if (hasBadge) continue;

      let qualified = false;

      // Check badge criteria
      switch (criteria.type) {
        case 'activity-time':
          const recentDays = activity.dailyActivity.slice(-7);
          const qualifyingDays = recentDays.filter(
            day => day.duration >= criteria.threshold
          );
          qualified = qualifyingDays.length >= 7;
          break;

        case 'streak':
          qualified = (activity.streak && activity.streak.current) >= criteria.threshold;
          break;

        case 'resources':
          const totalResourceActions = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.resourcesViewed || 0) + (day.actions?.resourcesDownloaded || 0),
            0
          );
          qualified = totalResourceActions >= criteria.threshold;
          break;

        case 'goals':
          const totalGoalActions = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.goalsUpdated || 0),
            0
          );
          qualified = totalGoalActions >= criteria.threshold;
          break;

        case 'posts':
          const totalPosts = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.postsCreated || 0),
            0
          );
          qualified = totalPosts >= criteria.threshold;
          break;

        case 'comments':
          const totalComments = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.commentsAdded || 0),
            0
          );
          qualified = totalComments >= criteria.threshold;
          break;
      }

      if (qualified) {
        activity.badges = activity.badges || [];
        activity.badges.push({
          badgeId,
          earnedAt: new Date()
        });

        // add points to user (Sequelize instance)
        user.totalPoints = (user.totalPoints || 0) + points;
        
        newBadges.push(badgeInstance);
      }
    }

    // Update user level based on points
    user.level = Math.floor((user.totalPoints || 0) / 100) + 1;

    await activity.save();
    await user.save();

    res.status(200).json({
      success: true,
      message: newBadges.length > 0 ? 'New badges earned!' : 'No new badges',
      newBadges,
      totalBadges: (activity.badges || []).length,
      level: user.level,
      points: user.totalPoints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get leaderboard
// @route   GET /api/activity/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const { User } = require('../config/database').models;
    
    // Replace MongoDB query with Sequelize query
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'profilePicture', 'totalPoints', 'level'],
      order: [['totalPoints', 'DESC']],
      limit: 50
    });

    const UserActivity = require('../models/UserActivity');
    
    // Get activity data for these users
    const userIds = users.map(u => u.id);
    const activities = await UserActivity.__getSequelizeModel().then(model => 
      model.findAll({
        where: { userId: userIds },
        attributes: ['userId', 'badges', 'streak']
      })
    );

    const leaderboard = users.map(user => {
      const activity = activities.find(
        a => a.userId === user.id
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          profilePicture: user.profilePicture
        },
        points: user.totalPoints,
        level: user.level,
        badges: activity ? (activity.badges?.length || 0) : 0,
        streak: activity ? (activity.streak?.current || 0) : 0
      };
    });

    res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};