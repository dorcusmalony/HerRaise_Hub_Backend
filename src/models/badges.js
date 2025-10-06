const db = require('../config/database');

async function getModel() {
  if (!db.models) {
    await db.connectDB();
  }
  return db.models.Badge;
}

module.exports = {
  // Sequelize-backed find (returns array)
  async find(filter = {}) {
    const Badge = await getModel();
    const where = {}; // simple mapping; can be extended
    if (filter.name) where.name = filter.name;
    return Badge.findAll({ where });
  },

  // Used by seedBadges.js
  async deleteMany() {
    const Badge = await getModel();
    return Badge.destroy({ where: {}, truncate: true, cascade: true });
  },

  // Used by seedBadges.js
  async insertMany(docs = []) {
    const Badge = await getModel();
    return Badge.bulkCreate(docs.map(d => ({
      name: d.name,
      description: d.description,
      icon: d.icon,
      criteria: d.criteria,
      points: d.points
    })));
  },

  // Expose Sequelize model if needed
  async __getSequelizeModel() { return await getModel(); }
};