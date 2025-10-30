const { Sequelize, DataTypes } = require('sequelize');
const { Client } = require('pg');

let sequelize;
let exportedModels = {};

async function ensureDatabaseExists({ dbName, dbUser, dbPass, dbHost, dbPort }) {
  const client = new Client({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: 'postgres'
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(` Created database "${dbName}"`);
    }
  } catch (err) {
    console.error(' Error ensuring database exists:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

const connectDB = async () => {
  const dbName = process.env.POSTGRES_DB || 'Her-connect';
  const dbUser = process.env.POSTGRES_USER || 'postgres';
  const dbPass = process.env.POSTGRES_PASSWORD || 'password';
  const dbHost = process.env.POSTGRES_HOST || 'localhost';
  const dbPort = process.env.POSTGRES_PORT || 5432;

  // New: respect DATABASE_URL and safety flags for managed hosts (Render)
  const databaseUrl = process.env.DATABASE_URL || null;
  const allowDbCreate = (process.env.DB_ALLOW_CREATE || 'false').toLowerCase() === 'true';
  const forceRecreateReports = (process.env.FORCE_RECREATE_REPORTS || 'false').toLowerCase() === 'true';
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  const sequelizeOptions = {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false,
  };

  // If using DATABASE_URL or running in production, enable SSL (common on Render)
  if (databaseUrl || isProduction) {
    sequelizeOptions.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  }

  // helper to attempt authentication with retries
  async function tryAuthenticate(instance, maxRetries = 5, retryDelayMs = 2000) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await instance.authenticate();
        return true;
      } catch (err) {
        attempt++;
        console.warn(` Sequelize connection attempt ${attempt} failed: ${err.message}`);
        if (attempt >= maxRetries) {
          return err; // return last error
        }
        await new Promise(res => setTimeout(res, retryDelayMs));
      }
    }
    return new Error('Unknown auth error');
  }

  // If a DATABASE_URL is provided prefer it, but fall back to individual POSTGRES_* values if unreachable
  if (databaseUrl) {
    sequelize = new Sequelize(databaseUrl, sequelizeOptions);
    console.log(' Using DATABASE_URL for connection (e.g. Render). Attempting to connect...');
    const authResult = await tryAuthenticate(sequelize, parseInt(process.env.DB_CONNECT_RETRIES, 10) || 5, parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 10) || 2000);
    if (authResult === true) {
      console.log(' PostgreSQL (Sequelize) connected via DATABASE_URL');
    } else {
      console.warn(' Failed to connect using DATABASE_URL:', authResult.message || authResult);
      // Try fallback using explicit POSTGRES_* env values (common for local development)
      console.log(' Attempting fallback connection using POSTGRES_HOST/POSTGRES_USER/POSTGRES_DB ...');
      // For local fallback, avoid forcing SSL which can block local connections
      const fallbackOptions = { ...sequelizeOptions };
      delete fallbackOptions.dialectOptions;
      sequelize = new Sequelize(dbName, dbUser, dbPass, { ...fallbackOptions, host: dbHost, port: dbPort });
      const fallbackAuth = await tryAuthenticate(sequelize, parseInt(process.env.DB_CONNECT_RETRIES, 10) || 5, parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 10) || 2000);
      if (fallbackAuth !== true) {
        console.error(' Sequelize could not connect to either DATABASE_URL or the POSTGRES_* fallback after retries.');
        console.error(' Last error:', fallbackAuth && fallbackAuth.message ? fallbackAuth.message : fallbackAuth);
        process.exit(1);
      } else {
        console.log(' PostgreSQL (Sequelize) connected using POSTGRES_* fallback. If you intended to use Render DB, ensure DATABASE_URL is reachable from this machine.');
      }
    }
  } else {
    // No DATABASE_URL - normal behavior: optionally ensure DB exists then connect using individual vars
    if (allowDbCreate) {
      try {
        await ensureDatabaseExists({ dbName, dbUser, dbPass, dbHost, dbPort });
      } catch (err) {
        console.error(' Could not ensure database exists. Check Postgres credentials and permissions.');
        process.exit(1);
      }
    } else {
      console.log(' DB creation skipped. Set DB_ALLOW_CREATE=true to enable creating the DB from app (not recommended on managed providers).');
    }

    sequelize = new Sequelize(dbName, dbUser, dbPass, sequelizeOptions);
    console.log(' Attempting to connect using POSTGRES_* settings...');
    const authResult = await tryAuthenticate(sequelize, parseInt(process.env.DB_CONNECT_RETRIES, 10) || 5, parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 10) || 2000);
    if (authResult !== true) {
      console.error(' Sequelize could not connect to the database after retries:', authResult && authResult.message ? authResult.message : authResult);
      process.exit(1);
    }
    console.log(' PostgreSQL (Sequelize) connected');
  }

  // Attempt to fix NULLs in Users if table exists
  try {
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users'"
    );

    if (tables.length > 0) {
      const [columns] = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'Users'"
      );
      console.log(' Found Users table with columns:', columns.map(c => c.column_name).join(', '));

      await sequelize.query(`
        UPDATE "Users" 
        SET 
          language = COALESCE(language, 'en'),
          "phoneNumber" = COALESCE("phoneNumber", '+211900000000'),
          "educationLevel" = COALESCE("educationLevel", 'secondary'),
          "isActive" = COALESCE("isActive", true),
          "totalPoints" = COALESCE("totalPoints", 0),
          "level" = COALESCE("level", 1)
        WHERE 
          language IS NULL 
          OR "phoneNumber" IS NULL
          OR "educationLevel" IS NULL
          OR "isActive" IS NULL
          OR "totalPoints" IS NULL
          OR "level" IS NULL
      `);
      const [nullCounts] = await sequelize.query(`
        SELECT 
          COUNT(*) FILTER (WHERE language IS NULL) as language_nulls,
          COUNT(*) FILTER (WHERE "phoneNumber" IS NULL) as phone_nulls,
          COUNT(*) FILTER (WHERE "educationLevel" IS NULL) as education_nulls
        FROM "Users"
      `);
      console.log(' Null value check after fixes:', nullCounts[0]);
    }
  } catch (fixErr) {
    console.warn(' Warning: Could not check/fix Users columns:', fixErr.message);
  }

  // Handle legacy Reports enum issues by dropping table if present (backup first)
  try {
    const [reportsTables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Reports'"
    );

    if (reportsTables.length > 0) {
      if (forceRecreateReports) {
        console.log(' Found Reports table. FORCE_RECREATE_REPORTS=true -> recreating Reports (backup will be created).');
        await sequelize.query(`
          CREATE TEMP TABLE IF NOT EXISTS reports_backup AS
          SELECT * FROM "Reports";
        `);
        await sequelize.query('DROP TABLE IF EXISTS "Reports" CASCADE;');
        await sequelize.query(`
          DROP TYPE IF EXISTS report_type_enum CASCADE;
          DROP TYPE IF EXISTS report_status_enum CASCADE;
          DROP TYPE IF EXISTS urgency_level_enum CASCADE;
          DROP TYPE IF EXISTS enum_Reports_type CASCADE;
          DROP TYPE IF EXISTS enum_Reports_status CASCADE;
        `).catch(() => {});
        console.log(' Reports table and enum types dropped successfully');
      } else {
        console.log(' Reports table exists. Not dropping in production. Set FORCE_RECREATE_REPORTS=true to force recreation (destructive).');
      }
    }
  } catch (reportFixErr) {
    console.warn(' Warning: Error handling Reports table:', reportFixErr && reportFixErr.message);
  }

  // Define models
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING },
    role: { type: DataTypes.ENUM('mentee', 'mentor', 'admin'), defaultValue: 'mentee' },
    profilePicture: DataTypes.STRING,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    totalPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
    level: { type: DataTypes.INTEGER, defaultValue: 1 },
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpire: DataTypes.DATE,
    language: { type: DataTypes.STRING, defaultValue: 'en', allowNull: false },
    phoneNumber: { type: DataTypes.STRING, defaultValue: '+211900000000', allowNull: false },
    location: { type: DataTypes.JSONB, defaultValue: { city: 'Unknown', state: 'Unknown' } },
    dateOfBirth: { type: DataTypes.DATE, defaultValue: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d; } },
    interests: { type: DataTypes.JSONB, defaultValue: ['personal growth', 'career development'] },
    educationLevel: { type: DataTypes.STRING, defaultValue: 'secondary', allowNull: false },
    yearsOfExperience: { type: DataTypes.INTEGER, defaultValue: 0 },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verificationDate: DataTypes.DATE
  }, { timestamps: true });

  // Hooks and methods
  {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');

    User.addHook('beforeCreate', async (user) => {
      if (user.password) {
        const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
        const salt = await bcrypt.genSalt(rounds);
        user.password = await bcrypt.hash(user.password, salt);
      }
    });

    User.addHook('beforeUpdate', async (user) => {
      const changed = typeof user.changed === 'function' ? user.changed('password') : (user._previousDataValues && user._previousDataValues.password !== user.password);
      if (changed) {
        const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
        const salt = await bcrypt.genSalt(rounds);
        user.password = await bcrypt.hash(user.password, salt);
      }
    });

    User.prototype.comparePassword = async function(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };

    User.prototype.getResetPasswordToken = function() {
      const resetToken = crypto.randomBytes(20).toString('hex');
      this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
      return resetToken;
    };
  }

  const Badge = sequelize.define('Badge', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    icon: DataTypes.STRING,
    criteria: { type: DataTypes.JSONB, allowNull: false },
    points: { type: DataTypes.INTEGER, defaultValue: 10 }
  }, { timestamps: true });

  const Resource = sequelize.define('Resource', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    category: DataTypes.STRING,
    fileUrl: DataTypes.TEXT,
    externalLink: DataTypes.TEXT,
    thumbnailUrl: DataTypes.STRING,
    fileSize: DataTypes.BIGINT,
    duration: DataTypes.INTEGER,
    language: DataTypes.STRING,
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
    isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    likes: { type: DataTypes.JSONB, defaultValue: [] }
  }, { timestamps: true });

  const Report = sequelize.define('Report', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'other' },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    urgencyLevel: { type: DataTypes.STRING, allowNull: false, defaultValue: 'medium' },
    isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
    relatedUserIds: { type: DataTypes.JSONB, defaultValue: [] },
    location: DataTypes.STRING,
    contact: DataTypes.STRING,
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    notifiedAt: DataTypes.DATE,
    resolvedAt: DataTypes.DATE
  }, { timestamps: true });

  const UserActivity = sequelize.define('UserActivity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    totalTimeSpent: { type: DataTypes.INTEGER, defaultValue: 0 },
    streak: { type: DataTypes.JSONB, defaultValue: { current: 0, longest: 0, lastActiveDate: null } },
    lastActiveDate: DataTypes.DATE,
    dailyActivity: { type: DataTypes.JSONB, defaultValue: [] },
    badges: { type: DataTypes.JSONB, defaultValue: [] }
  }, { timestamps: true });

  const MentorProfile = sequelize.define('MentorProfile', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    expertise: { type: DataTypes.JSONB, defaultValue: [] },
    bio: DataTypes.TEXT,
    professionalTitle: DataTypes.STRING,
    organization: DataTypes.STRING,
    availabilityHours: { type: DataTypes.JSONB, defaultValue: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] } },
    maxMentees: { type: DataTypes.INTEGER, defaultValue: 5 },
    linkedinProfile: DataTypes.STRING,
    educationHistory: { type: DataTypes.JSONB, defaultValue: [] },
    workHistory: { type: DataTypes.JSONB, defaultValue: [] }
  }, { timestamps: true });

  const Opportunity = sequelize.define('Opportunity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    type: { 
      type: DataTypes.ENUM('internship', 'scholarship', 'event', 'job', 'workshop', 'competition'), 
      allowNull: false 
    },
    organization: DataTypes.STRING,
    location: DataTypes.STRING,
    applicationDeadline: DataTypes.DATE,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    eligibilityCriteria: { type: DataTypes.JSONB, defaultValue: [] },
    applicationLink: { type: DataTypes.TEXT, allowNull: false }, // External link
    contactEmail: DataTypes.STRING,
    requirements: { type: DataTypes.JSONB, defaultValue: [] },
    benefits: { type: DataTypes.JSONB, defaultValue: [] },
    amount: DataTypes.STRING, // For scholarships
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    clickCount: { type: DataTypes.INTEGER, defaultValue: 0 }, // Track external clicks
    interestedUsers: { type: DataTypes.JSONB, defaultValue: [] }, // Users who bookmarked
    tags: { type: DataTypes.JSONB, defaultValue: [] }
  }, { timestamps: true });

  const Application = sequelize.define('Application', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: { 
      type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn'),
      defaultValue: 'draft'
    },
    applicationData: { type: DataTypes.JSONB, defaultValue: {} },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    submittedAt: DataTypes.DATE,
    reviewedAt: DataTypes.DATE,
    statusHistory: { type: DataTypes.JSONB, defaultValue: [] },
    notes: DataTypes.TEXT,
    remindersSent: { type: DataTypes.JSONB, defaultValue: [] }
  }, { timestamps: true });

  const ForumPost = sequelize.define('ForumPost', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    type: { 
      type: DataTypes.ENUM('discussion', 'question', 'project', 'announcement', 'feedback', 'essay', 'video'), 
      defaultValue: 'discussion' 
    },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    likes: { type: DataTypes.JSONB, defaultValue: [] },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
    isLocked: { type: DataTypes.BOOLEAN, defaultValue: false },
    attachments: { type: DataTypes.JSONB, defaultValue: [] }
  }, { timestamps: true });

  const ForumComment = sequelize.define('ForumComment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    likes: { type: DataTypes.JSONB, defaultValue: [] },
    parentCommentId: { type: DataTypes.UUID, allowNull: true } // For nested replies
  }, { timestamps: true });

  const Scholarship = sequelize.define('Scholarship', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.ENUM('scholarship', 'internship', 'competition'), allowNull: false },
    deadline: { type: DataTypes.DATE, allowNull: false },
    amount: DataTypes.STRING,
    eligibility: DataTypes.TEXT,
    applicationUrl: DataTypes.STRING,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    postedBy: { type: DataTypes.UUID, allowNull: false }
  }, { timestamps: true });

  const ScholarshipApplication = sequelize.define('ScholarshipApplication', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    scholarshipId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'submitted', 'under_review', 'accepted', 'rejected'), defaultValue: 'pending' },
    notes: DataTypes.TEXT,
    appliedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { timestamps: true });

  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    type: { 
      type: DataTypes.ENUM(
        'forum_question', 'forum_answer', 'forum_comment', 'forum_like', 
        'opportunity', 'website_update', 'scholarship', 'application_update', 'deadline_reminder'
      ), 
      allowNull: false 
    },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    data: { type: DataTypes.JSONB, defaultValue: {} },
    priority: { type: DataTypes.ENUM('low', 'normal', 'high'), defaultValue: 'normal' },
    readStatus: { type: DataTypes.BOOLEAN, defaultValue: false },
    relatedId: DataTypes.UUID,
    link: DataTypes.STRING
  }, { timestamps: true });

  // Associations
  User.hasMany(Resource, { foreignKey: 'uploadedBy' });
  Resource.belongsTo(User, { foreignKey: 'uploadedBy' });

  Report.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });
  Report.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });

  User.hasOne(UserActivity, { foreignKey: 'userId' });
  UserActivity.belongsTo(User, { foreignKey: 'userId' });

  User.hasOne(MentorProfile, { foreignKey: 'userId' });
  MentorProfile.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(Opportunity, { foreignKey: 'creatorId' });
  Opportunity.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });

  // Add associations
  User.hasMany(Application, { foreignKey: 'userId' });
  Application.belongsTo(User, { foreignKey: 'userId' });

  Opportunity.hasMany(Application, { foreignKey: 'opportunityId' });
  Application.belongsTo(Opportunity, { foreignKey: 'opportunityId' });

  // Forum associations
  User.hasMany(ForumPost, { foreignKey: 'authorId' });
  ForumPost.belongsTo(User, { as: 'author', foreignKey: 'authorId' });

  ForumPost.hasMany(ForumComment, { foreignKey: 'postId' });
  ForumComment.belongsTo(ForumPost, { foreignKey: 'postId' });

  User.hasMany(ForumComment, { foreignKey: 'authorId' });
  ForumComment.belongsTo(User, { as: 'author', foreignKey: 'authorId' });

  // Self-referential relationship for nested comments
  ForumComment.hasMany(ForumComment, { as: 'replies', foreignKey: 'parentCommentId' });
  ForumComment.belongsTo(ForumComment, { as: 'parent', foreignKey: 'parentCommentId' });

  // Scholarship associations
  User.hasMany(Scholarship, { foreignKey: 'postedBy' });
  Scholarship.belongsTo(User, { foreignKey: 'postedBy' });

  User.hasMany(ScholarshipApplication, { foreignKey: 'userId' });
  ScholarshipApplication.belongsTo(User, { foreignKey: 'userId' });

  Scholarship.hasMany(ScholarshipApplication, { foreignKey: 'scholarshipId' });
  ScholarshipApplication.belongsTo(Scholarship, { foreignKey: 'scholarshipId' });

  // Notification associations
  User.hasMany(Notification, { foreignKey: 'userId' });
  Notification.belongsTo(User, { foreignKey: 'userId' });

  // User Application Tracker
  const UserApplication = require('../models/UserApplication')(sequelize);
  User.hasMany(UserApplication, { foreignKey: 'userId' });
  UserApplication.belongsTo(User, { foreignKey: 'userId' });
  Opportunity.hasMany(UserApplication, { foreignKey: 'opportunityId' });
  UserApplication.belongsTo(Opportunity, { foreignKey: 'opportunityId' });

  // Push Subscription for notifications
  const PushSubscription = require('../models/PushSubscription')(sequelize);
  User.hasMany(PushSubscription, { foreignKey: 'userId' });
  PushSubscription.belongsTo(User, { foreignKey: 'userId' });

  // Opportunity Interaction tracking
  const OpportunityInteraction = require('../models/OpportunityInteraction')(sequelize);
  User.hasMany(OpportunityInteraction, { foreignKey: 'userId' });
  OpportunityInteraction.belongsTo(User, { foreignKey: 'userId' });
  Opportunity.hasMany(OpportunityInteraction, { foreignKey: 'opportunityId' });
  OpportunityInteraction.belongsTo(Opportunity, { foreignKey: 'opportunityId' });

  // Exported models
  exportedModels = {
    User,
    Badge,
    Resource,
    Report,
    UserActivity,
    MentorProfile,
    Opportunity,
    Application,
    ForumPost,
    ForumComment,
    Scholarship,
    ScholarshipApplication,
    Notification,
    UserApplication,
    PushSubscription,
    OpportunityInteraction
  };

  // Sync models: non-Report first, then recreate Report only if forced
  try {
    for (const modelName of Object.keys(exportedModels)) {
      if (modelName === 'Report') continue;
      await exportedModels[modelName].sync({ alter: true });
    }

    if (forceRecreateReports) {
      await Report.sync({ force: true });
      console.log(' Reports table recreated successfully (force).');
    } else {
      // safer: alter rather than force to avoid accidental data loss on managed DBs
      await Report.sync({ alter: true });
      console.log(' Reports table synced (alter).');
    }

    console.log(' Sequelize models synced (tables created/updated)');
  } catch (syncErr) {
    console.error(' Sequelize sync error:', syncErr && syncErr.message);
    process.exit(1);
  }

  module.exports.sequelize = sequelize;
  module.exports.models = exportedModels;
  return sequelize;
};

module.exports.connectDB = connectDB;
