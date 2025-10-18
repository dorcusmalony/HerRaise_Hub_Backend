const db = require('../config/database');

async function getModels() {
  if (!db.models) await db.connectDB();
  return db.models;
}

module.exports = {
  async find(filter = {}) {
    const { Opportunity, User } = await getModels();
    const { Op } = require('sequelize');
    const where = { isActive: true };
    
    if (filter.type && filter.type !== 'all') {
      where.type = filter.type;
    }
    if (filter.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${filter.search}%` } },
        { description: { [Op.iLike]: `%${filter.search}%` } },
        { organization: { [Op.iLike]: `%${filter.search}%` } }
      ];
    }
    if (filter.deadline) {
      where.applicationDeadline = { [Op.gte]: new Date() };
    }

    const rows = await Opportunity.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }]
    });
    return rows;
  },

  async findById(id) {
    const { Opportunity, User } = await getModels();
    return await Opportunity.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }]
    });
  },

  async create(data) {
    const { Opportunity } = await getModels();
    return await Opportunity.create(data);
  },

  async __getSequelizeModel() { 
    return (await getModels()).Opportunity; 
  }
};
