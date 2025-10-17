const db = require('../config/database');
const { Op, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes, _models) => {  // Line 33: Rename to _models
  const Resource = sequelize.define(
    'Resource',
    {
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: false },
      fileUrl: { type: DataTypes.STRING, allowNull: false },
      externalLink: { type: DataTypes.STRING, allowNull: false },
      language: { type: DataTypes.STRING, allowNull: false },
      tags: { type: DataTypes.JSON, allowNull: true },
      uploadedBy: { type: DataTypes.INTEGER, allowNull: false },
      isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      thumbnailUrl: { type: DataTypes.STRING, allowNull: true },
      fileSize: { type: DataTypes.BIGINT, allowNull: true },
      duration: { type: DataTypes.INTEGER, allowNull: true }
    },
    {
      timestamps: true,
      tableName: 'resources'
    }
  );

  async function getModels() {
    if (!db.models) await db.connectDB();
    return db.models;
  }

  function wrapInstance(instance, models) {
    if (!instance) return null;
    // add mongoose-style helpers used in controllers
    instance.incrementView = async function() {
      this.views = (this.views || 0) + 1;
      return this.save();
    };
    instance.incrementDownload = async function() {
      this.downloads = (this.downloads || 0) + 1;
      return this.save();
    };
    instance.deleteOne = async function() {
      await this.destroy();
      return this;
    };
    // likes is a JSON array of user ids
    instance.toJSON = function() {
      return instance.get({ plain: true });
    };
    return instance;
  }

  Resource.prototype.incrementView = async function() {
    this.views = (this.views || 0) + 1;
    return this.save();
  };

  Resource.prototype.incrementDownload = async function() {
    this.downloads = (this.downloads || 0) + 1;
    return this.save();
  };

  Resource.prototype.deleteOne = async function() {
    await this.destroy();
    return this;
  };

  Resource.prototype.toJSON = function() {
    return this.get({ plain: true });
  };

  return {
    // find with simple filter and optional search
    async find(filter = {}) {
      const { Resource, User } = await getModels();
      const where = {};
      if (filter.isApproved !== undefined) where.isApproved = filter.isApproved;
      if (filter.type) where.type = filter.type;
      if (filter.category) where.category = filter.category;
      if (filter.language) where.language = filter.language;

      // handle simple search provided by controllers
      if (filter.$or && Array.isArray(filter.$or)) {
        // controllers sometimes pass $or with regex; we map to ILIKE on title/description
        // fallback to no-op; better searches can be added later
      }

      // if search param passed in filter.search
      if (filter.search) {
        const s = `%${filter.search}%`;
        where[Op.or] = [
          { title: { [Op.iLike]: s } },
          { description: { [Op.iLike]: s } },
          Sequelize.where(Sequelize.cast(Sequelize.col('tags'), 'text'), { [Op.iLike]: s })
        ];
      }

      const resources = await Resource.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, attributes: ['id', 'name', 'profilePicture', 'role'] }]
      });

      return resources.map(r => wrapInstance(r));
    },

    async findById(id) {
      const { Resource, User } = await getModels();
      const resource = await Resource.findByPk(id, {
        include: [{ model: User, attributes: ['id', 'name', 'profilePicture', 'role'] }]
      });
      return wrapInstance(resource);
    },

    async create(data) {
      const { Resource } = await getModels();
      const tags = data.tags && Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()) : []);
      const resource = await Resource.create({
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        fileUrl: data.fileUrl,
        externalLink: data.externalLink,
        language: data.language,
        tags,
        uploadedBy: data.uploadedBy,
        isApproved: data.isApproved || false,
        thumbnailUrl: data.thumbnailUrl,
        fileSize: data.fileSize,
        duration: data.duration
      });
      return wrapInstance(resource);
    },

    // Expose Sequelize model reference
    async __getSequelizeModel() {
      const { Resource } = await getModels();
      return Resource;
    }
  };
};