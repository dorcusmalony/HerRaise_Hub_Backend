const db = require('../config/database');

async function getModels() {
  if (!db.models) await db.connectDB();
  return db.models;
}

function wrapInstance(instance, models) {
  if (!instance) return null;
  instance.toJSON = function() { return instance.get({ plain: true }); };
  instance.milestones = instance.milestones || instance.get('milestones') || [];
  instance._getMilestoneById = function(milestoneId) {
    return instance.milestones.find(m => m.id && String(m.id) === String(milestoneId));
  };
  return instance;
}

module.exports = {
  async create(data) {
    const { Goal } = await getModels();
    const goal = await Goal.create({
      userId: data.user,
      title: data.title,
      description: data.description,
      type: data.type,
      category: data.category,
      targetDate: data.targetDate,
      status: data.status || 'not-started',
      progress: data.progress || 0,
      reminders: data.reminders || { enabled: true, frequency: 'weekly', lastSent: null },
      milestones: data.milestones || [],
      isPublic: data.isPublic || false,
      completedAt: data.completedAt || null
    });
    return wrapInstance(goal);
  },

  async find(filter = {}) {
    const { Goal, User } = await getModels();
    const where = {};
    if (filter.user) where.userId = filter.user;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;

    const rows = await Goal.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['id', 'name', 'profilePicture'] }]
    });
    return rows.map(r => wrapInstance(r));
  },

  async findById(id) {
    const { Goal, User } = await getModels();
    const row = await Goal.findByPk(id, {
      include: [{ model: User, attributes: ['id', 'name', 'profilePicture'] }]
    });
    return wrapInstance(row);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const { Goal } = await getModels();
    const instance = await Goal.findByPk(id);
    if (!instance) return null;
    Object.keys(update).forEach(k => { instance[k] = update[k]; });
    await instance.save();
    return options.new ? await Goal.findByPk(id) : instance;
  },

  async findByIdAndDelete(id) {
    const { Goal } = await getModels();
    const instance = await Goal.findByPk(id);
    if (!instance) return null;
    await instance.destroy();
    return instance;
  },

  async __getSequelizeModel() { return (await getModels()).Goal; }
};