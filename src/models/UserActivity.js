const db = require('../config/database');

async function getModels() {
  if (!db.models) await db.connectDB();
  return db.models;
}

function wrapInstance(instance) {
  if (!instance) return null;

  // helper to persist the instance (Sequelize instance supports save)
  instance.recordActivity = async function(activityType, duration = 0) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const data = instance.get({ plain: true });

    const dailyActivity = data.dailyActivity || [];
    let todayActivity = dailyActivity.find(a => new Date(a.date).getTime() === today.getTime());

    if (!todayActivity) {
      todayActivity = {
        date: today,
        duration: 0,
        actions: {
          postsCreated: 0,
          commentsAdded: 0,
          resourcesViewed: 0,
          resourcesDownloaded: 0,
          goalsUpdated: 0
        }
      };
      dailyActivity.push(todayActivity);
    }

    if (activityType && todayActivity.actions[activityType] !== undefined) {
      todayActivity.actions[activityType] += 1;
    }

    todayActivity.duration += duration;
    instance.totalTimeSpent = (instance.totalTimeSpent || 0) + duration;
    instance.dailyActivity = dailyActivity;

    // update streak (stored in instance.streak JSON)
    const now = today;
    const streak = instance.streak || { current: 0, longest: 0, lastActiveDate: null };
    const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
    if (!lastActive) {
      streak.current = 1;
      streak.longest = Math.max(streak.longest || 0, streak.current);
    } else {
      const daysDiff = Math.floor((now - new Date(lastActive.setHours(0,0,0,0))) / (1000*60*60*24));
      if (daysDiff === 1) {
        streak.current = (streak.current || 0) + 1;
        if (streak.current > (streak.longest || 0)) streak.longest = streak.current;
      } else if (daysDiff > 1) {
        streak.current = 1;
      }
    }
    streak.lastActiveDate = now;
    instance.streak = streak;

    await instance.save();
    return instance;
  };

  return instance;
}

module.exports = {
  async findOne(filter = {}) {
    const { UserActivity } = await getModels();
    const where = {};
    if (filter.user) where.userId = filter.user;
    const row = await UserActivity.findOne({ where });
    return wrapInstance(row);
  },

  async create(data) {
    const { UserActivity } = await getModels();
    const row = await UserActivity.create({
      userId: data.user,
      dailyActivity: data.dailyActivity || [],
      totalTimeSpent: data.totalTimeSpent || 0,
      streak: data.streak || { current: 0, longest: 0, lastActiveDate: null },
      badges: data.badges || []
    });
    return wrapInstance(row);
  },

  async find(filter = {}) {
    const { UserActivity } = await getModels();
    const where = {};
    if (filter.user) where.userId = filter.user;
    const rows = await UserActivity.findAll({ where });
    return rows.map(r => wrapInstance(r));
  },

  async __getSequelizeModel() { return (await getModels()).UserActivity; }
};