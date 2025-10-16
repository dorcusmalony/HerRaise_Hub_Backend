const db = require('../config/database');

// Helper to ensure Sequelize models are ready
async function getUserModel() {
  if (!db.models) {
    if (typeof db.connectDB === 'function') {
      await db.connectDB();
    } else {
      throw new Error('Database connect function not found');
    }
  }
  return db.models.User;
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['mentee', 'mentor', 'admin'], default: 'mentee' },
  
  // Profile fields
  bio: { type: String, maxlength: 500 },
  phoneNumber: { type: String },
  location: {
    city: { type: String },
    state: { type: String }
  },
  dateOfBirth: { type: String }, // or Date type
  interests: [{ type: String }],
  educationLevel: { 
    type: String, 
    enum: ['', 'secondary', 'bachelor', 'master', 'phd', 'other'] 
  },
  profilePicture: { type: String }, // URL to image
  
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

// Utility to parse Mongoose-style projection strings into Sequelize attributes
function parseProjection(proj) {
  if (!proj) return {};
  proj = proj.trim();
  // Exclude syntax: "-password"
  if (proj.startsWith('-')) {
    const fields = proj.split(/\s+/).map(s => s.replace(/^-/, '').trim());
    return { exclude: fields };
  }
  // Include syntax: "name email" or "+password"
  const fields = proj.replace(/^\+/, '').split(/\s+/).map(s => s.trim()).filter(Boolean);
  return { include: fields };
}

// Chainable query-builder factory (for find)
function queryBuilder(criteria = {}) {
  const opts = {
    where: criteria,
    attributes: undefined,
    order: undefined,
    limit: undefined
  };

  const builder = {
    select(proj) {
      const parsed = parseProjection(proj);
      if (parsed.include) opts.attributes = parsed.include;
      if (parsed.exclude) opts.attributes = { exclude: parsed.exclude };
      return this;
    },
    sort(sortObj) {
      if (sortObj && typeof sortObj === 'object') {
        opts.order = Object.entries(sortObj).map(([k, v]) => [k, v === -1 ? 'DESC' : 'ASC']);
      }
      return this;
    },
    limit(n) {
      opts.limit = n;
      return this;
    },
    // make the builder awaitable (thenable)
    then: async (resolve, reject) => {
      try {
        const User = await getUserModel();
        const q = { where: opts.where };
        if (opts.attributes) q.attributes = opts.attributes;
        if (opts.order) q.order = opts.order;
        if (opts.limit) q.limit = opts.limit;
        const rows = await User.findAll(q);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    }
  };

  return builder;
}

module.exports = {
  // mimics Mongoose's find(criteria).select(...).sort(...).limit(...)
  find(criteria = {}) {
    return queryBuilder(criteria);
  },

  // mimics Mongoose's findOne(criteria).select(...)
  findOne(criteria = {}) {
    const opts = { where: criteria, attributes: undefined };
    const wrapper = {
      select(proj) {
        const parsed = parseProjection(proj);
        if (parsed.include) opts.attributes = parsed.include;
        if (parsed.exclude) opts.attributes = { exclude: parsed.exclude };
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const User = await getUserModel();
          const q = { where: opts.where };
          if (opts.attributes) q.attributes = opts.attributes;
          const row = await User.findOne(q);
          resolve(row);
        } catch (err) {
          reject(err);
        }
      }
    };
    return wrapper;
  },

  // mimics findById(id).select(...)
  findById(id) {
    const opts = { attributes: undefined };
    const wrapper = {
      select(proj) {
        const parsed = parseProjection(proj);
        if (parsed.include) opts.attributes = parsed.include;
        if (parsed.exclude) opts.attributes = { exclude: parsed.exclude };
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const User = await getUserModel();
          const q = {};
          if (opts.attributes) q.attributes = opts.attributes;
          const row = await User.findByPk(id, q);
          resolve(row);
        } catch (err) {
          reject(err);
        }
      }
    };
    return wrapper;
  },

  // create a new user (proxied)
  async create(data) {
    const User = await getUserModel();
    // Apply default values for missing fields
    const userData = {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'mentee',
      language: data.language || 'en',
      phoneNumber: data.phoneNumber || '+211900000000',
      location: data.location || { city: "Unknown", state: "Unknown" },
      dateOfBirth: data.dateOfBirth || (() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 18);
        return date;
      })(),
      interests: Array.isArray(data.interests) && data.interests.length > 0 
        ? data.interests 
        : ['personal growth', 'career development'],
      educationLevel: data.educationLevel || 'secondary'
    };
    
    return User.create(userData);
  },

  // findByIdAndUpdate(id, update, options) -> returns updated instance
  async findByIdAndUpdate(id, update, options = { new: true, runValidators: true }) {
    const User = await getUserModel();
    const instance = await User.findByPk(id);
    if (!instance) return null;
    Object.keys(update).forEach(k => {
      instance[k] = update[k];
    });
    await instance.save();
    return options.new ? await User.findByPk(id) : instance;
  },

  // findByIdAndDelete / findByIdAndRemove
  async findByIdAndDelete(id) {
    const User = await getUserModel();
    const instance = await User.findByPk(id);
    if (!instance) return null;
    await instance.destroy();
    return instance;
  },

  async findByIdAndRemove(id) {
    return this.findByIdAndDelete(id);
  },

  // Expose a low-level access to the Sequelize model when needed
  async __getSequelizeModel() {
    return await getUserModel();
  }
};