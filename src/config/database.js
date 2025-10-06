const { Sequelize, DataTypes } = require('sequelize');
const { Client } = require('pg');

let sequelize;
let exportedModels = {};

async function ensureDatabaseExists({ dbName, dbUser, dbPass, dbHost, dbPort }) {
  // Connect to the default maintenance DB to create the target DB if missing
  const client = new Client({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: 'postgres' // maintenance DB
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      // Create database
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(` Created database "${dbName}"`);
    } else {
      // Database exists
      // console.log(`Database "${dbName}" already exists`);
    }
  } catch (err) {
    // If permission denied or not able to create DB, rethrow with context
    console.error(' Error ensuring database exists:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

const connectDB = async () => {
	// Enforce Postgres-only usage for this codebase
	const dbName = process.env.POSTGRES_DB || 'Her-connect';
	const dbUser = process.env.POSTGRES_USER || 'postgres';
	const dbPass = process.env.POSTGRES_PASSWORD || 'password';
	const dbHost = process.env.POSTGRES_HOST || 'localhost';
	const dbPort = process.env.POSTGRES_PORT || 5432;

	// Ensure DB exists before Sequelize connects
	try {
		await ensureDatabaseExists({ dbName, dbUser, dbPass, dbHost, dbPort });
	} catch (err) {
		console.error(' Could not ensure database exists. Check Postgres credentials and permissions.');
		process.exit(1);
	}

	sequelize = new Sequelize(dbName, dbUser, dbPass, {
		host: dbHost,
		port: dbPort,
		dialect: 'postgres',
		logging: false
	});

	try {
		await sequelize.authenticate();
		console.log(' PostgreSQL (Sequelize) connected');
		
		// Check for existing Users table and fix ALL null values before sync
		try {
			// Check if table exists first to avoid errors on fresh installs
			const [tables] = await sequelize.query(
				"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users'"
			);
			
			if (tables.length > 0) {
				// First check which columns exist and need fixes
				const [columns] = await sequelize.query(
					"SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'Users'"
				);
				console.log(' Found Users table with columns:', columns.map(c => c.column_name).join(', '));
				
				// Fix any NULL values in required columns with a SINGLE update
				// This ensures all fixes are applied in one go to prevent sync issues
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
				console.log(' Fixed all NULL values in Users table required columns');
				
				// Verify the fix
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
			console.warn(' Warning: Could not check/fix columns:', fixErr.message);
			// Continue anyway, as the table might not exist yet in first run
		}
	} catch (error) {
		console.error(' PostgreSQL connection error:', error.message);
		process.exit(1);
	}

	// Define minimal models to create schema for backend features
	const User = sequelize.define('User', {
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true
		},
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

		// Ensure all mentee profile fields have proper defaults
		language: { 
			type: DataTypes.STRING, 
			defaultValue: 'en', 
			allowNull: false,
			validate: {
				isIn: [['en', 'ar', 'juba-ar']] // English, Arabic, Juba Arabic
			}
		},
		phoneNumber: { type: DataTypes.STRING, defaultValue: '+211900000000', allowNull: false },
		location: { type: DataTypes.JSONB, defaultValue: { city: "Unknown", state: "Unknown" } },
		dateOfBirth: {
			type: DataTypes.DATE,
			defaultValue: () => {
				const date = new Date();
				date.setFullYear(date.getFullYear() - 18);
				return date;
			}
		},
		interests: { type: DataTypes.JSONB, defaultValue: ['personal growth', 'career development'] },
		educationLevel: { type: DataTypes.STRING, defaultValue: 'secondary', allowNull: false }
	}, { timestamps: true });

	// Add hooks and instance methods for password hashing & reset token
	// (uses bcryptjs and crypto)
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
			if (typeof user.changed === 'function' ? user.changed('password') : user._previousDataValues && user._previousDataValues.password !== user.password) {
				const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
				const salt = await bcrypt.genSalt(rounds);
				user.password = await bcrypt.hash(user.password, salt);
			}
		});

		// instance method to compare password
		User.prototype.comparePassword = async function(candidatePassword) {
			return bcrypt.compare(candidatePassword, this.password);
		};

		// instance method to create reset token
		User.prototype.getResetPasswordToken = function() {
			const resetToken = crypto.randomBytes(20).toString('hex');
			this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
			this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
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
		category: { type: DataTypes.STRING },
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
		likes: { type: DataTypes.JSONB, defaultValue: [] } // added: store array of userIds (UUIDs)
	}, { timestamps: true });

	const Goal = sequelize.define('Goal', {
		id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
		title: { type: DataTypes.STRING, allowNull: false },
		description: { type: DataTypes.TEXT },
		type: { type: DataTypes.STRING },
		category: { type: DataTypes.STRING },
		targetDate: DataTypes.DATE,
		status: { type: DataTypes.STRING, defaultValue: 'not-started' },
		progress: { type: DataTypes.INTEGER, defaultValue: 0 },
		reminders: { type: DataTypes.JSONB, defaultValue: { enabled: true, frequency: 'weekly', lastSent: null } },
		isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
		completedAt: DataTypes.DATE
	}, { timestamps: true });

	const GoalMilestone = sequelize.define('GoalMilestone', {
		id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
		title: { type: DataTypes.STRING, allowNull: false },
		description: DataTypes.TEXT,
		isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
		completedAt: DataTypes.DATE
	}, { timestamps: false });

	const MentorComment = sequelize.define('MentorComment', {
		id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
		comment: { type: DataTypes.TEXT, allowNull: false }
	}, { timestamps: true });

	const Report = sequelize.define('Report', {
		id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
		type: { type: DataTypes.STRING, defaultValue: 'other' },
		description: { type: DataTypes.TEXT, allowNull: false },
		location: DataTypes.STRING,
		contact: DataTypes.STRING,
		status: { type: DataTypes.STRING, defaultValue: 'open' },
		metadata: { type: DataTypes.JSONB, defaultValue: {} },
		resolvedAt: DataTypes.DATE
	}, { timestamps: true });

	const UserActivity = sequelize.define('UserActivity', {
		id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
		totalTimeSpent: { type: DataTypes.INTEGER, defaultValue: 0 },
		// Store streak as JSONB so controllers that expect streak.current/longest/lastActiveDate work easily
		streak: { type: DataTypes.JSONB, defaultValue: { current: 0, longest: 0, lastActiveDate: null } },
		lastActiveDate: DataTypes.DATE,
		dailyActivity: { type: DataTypes.JSONB, defaultValue: [] },
		badges: { type: DataTypes.JSONB, defaultValue: [] }
	}, { timestamps: true });

	// Associations
	User.hasMany(Resource, { foreignKey: 'uploadedBy' });
	Resource.belongsTo(User, { foreignKey: 'uploadedBy' });

	User.hasMany(Goal, { foreignKey: 'userId' });
	Goal.belongsTo(User, { foreignKey: 'userId' });

	Goal.hasMany(GoalMilestone, { as: 'milestones', foreignKey: 'goalId' });
	GoalMilestone.belongsTo(Goal, { foreignKey: 'goalId' });

	Goal.hasMany(MentorComment, { as: 'mentorComments', foreignKey: 'goalId' });
	MentorComment.belongsTo(Goal, { foreignKey: 'goalId' });
	MentorComment.belongsTo(User, { as: 'mentor', foreignKey: 'mentorId' });

	Report.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });
	Report.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });

	User.hasOne(UserActivity, { foreignKey: 'userId' });
	UserActivity.belongsTo(User, { foreignKey: 'userId' });

	// Export models for seeders and later migrations
	exportedModels = { User, Badge, Resource, Goal, GoalMilestone, MentorComment, Report, UserActivity };

	// Sync models to create tables (use alter in development to adjust schema)
	try {
		await sequelize.sync({ alter: true });
		console.log(' Sequelize models synced (tables created/updated)');
	} catch (syncErr) {
		console.error(' Sequelize sync error:', syncErr.message);
		process.exit(1);
	}

	// Export for other modules
	module.exports.sequelize = sequelize;
	module.exports.models = exportedModels;
	return sequelize;
};

module.exports.connectDB = connectDB;
