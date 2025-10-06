const db = require('../config/database');

async function getModels() {
  if (!db.models) await db.connectDB();
  return db.models;
}

function wrapInstance(instance, models) {
  if (!instance) return null;
  instance.toJSON = function() { return instance.get({ plain: true }); };
  return instance;
}

module.exports = {
  async create(data) {
    const { Report } = await getModels();
    const r = await Report.create({
      reporterId: data.reporter,
      type: data.type,
      description: data.description,
      location: data.location,
      contact: data.contact,
      metadata: data.metadata || {},
      status: data.status || 'open'
    });
    return wrapInstance(r);
  },

  async find(filter = {}) {
    const { Report, User } = await getModels();
    const where = {};
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.reporter) where.reporterId = filter.reporter;

    const rows = await Report.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ]
    });
    return rows.map(r => wrapInstance(r));
  },

  async findById(id) {
    const { Report, User } = await getModels();
    const row = await Report.findByPk(id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ]
    });
    return wrapInstance(row);
  },

  // allow saving via instance.save() on Sequelize instance (returned value already supports save)
  async __getSequelizeModel() { return (await getModels()).Report; }
};
