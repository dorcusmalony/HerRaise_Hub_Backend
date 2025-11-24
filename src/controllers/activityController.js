const UserActivity = require('../models/UserActivity');
const Badge = require('../models/badges');
const User = require('../models/user');
const db = require('../config/database');

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
        case 'activity-time': {
          const recentDays = activity.dailyActivity.slice(-7);
          const qualifyingDays = recentDays.filter(
            day => day.duration >= criteria.threshold
          );
          qualified = qualifyingDays.length >= 7;
          break;
        }

        case 'streak': {
          qualified = (activity.streak && activity.streak.current) >= criteria.threshold;
          break;
        }

        case 'resources': {
          const totalResourceActions = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.resourcesViewed || 0) + (day.actions?.resourcesDownloaded || 0),
            0
          );
          qualified = totalResourceActions >= criteria.threshold;
          break;
        }

        case 'goals': {
          const totalGoalActions = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.goalsUpdated || 0),
            0
          );
          qualified = totalGoalActions >= criteria.threshold;
          break;
        }

        case 'posts': {
          const totalPosts = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.postsCreated || 0),
            0
          );
          qualified = totalPosts >= criteria.threshold;
          break;
        }

        case 'comments': {
          const totalComments = (activity.dailyActivity || []).reduce(
            (sum, day) => sum + (day.actions?.commentsAdded || 0),
            0
          );
          qualified = totalComments >= criteria.threshold;
          break;
        }

        default:
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

exports.getLeaderboard = async (req, res) => {
  try {
    const { User } = require('../config/database').models;
    
    
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'profilePicture', 'totalPoints', 'level'],
      order: [['totalPoints', 'DESC']],
      limit: 50
    });

    const UserActivity = require('../models/UserActivity');
    
    
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

exports.logActivity = async (req, res) => {
  try {
    const { type, resourceId } = req.body;
    const userId = req.user.id;

    // Find or create user activity record
    const activity = await UserActivity.findOne({ where: { userId } });
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    // Award points based on activity type
    let pointsEarned = 0;

    // Process activity based on type
    switch (type) {
      case 'resource_view': {
        const Resource = db.models.Resource;
        const resource = await Resource.findByPk(resourceId);
        pointsEarned = 2; // Default points for resource view

        
        if (resource && resource.type === 'video') {
          pointsEarned += 3;
        }
        break;
      }

      case 'login': {
        pointsEarned = 5;
        break;
      }

      case 'profile_update': {
        pointsEarned = 10;
        break;
      }

      case 'resource_share': {
        pointsEarned = 15;
        break;
      }

      case 'mentor_session': {
        pointsEarned = 30;
        break;
      }

      case 'course_complete': {
        pointsEarned = 50;
        break;
      }

      default:
        break;
    }

    
    activity.totalTimeSpent += pointsEarned;
    activity.dailyActivity.push({
      date: new Date(),
      type,
      duration: pointsEarned,
      resourceId
    });

    await activity.save();

    // Update user points and level
    const user = await User.findById(userId);
    user.totalPoints = (user.totalPoints || 0) + pointsEarned;
    user.level = Math.floor((user.totalPoints || 0) / 100) + 1;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Activity logged successfully',
      pointsEarned,
      totalPoints: user.totalPoints,
      level: user.level
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};