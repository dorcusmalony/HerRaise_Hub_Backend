require('dotenv').config();
// Enforce Postgres-only usage for this codebase
process.env.DB_TYPE = 'postgres';
const dbModule = require('./src/config/database');
const seedBadges = require('./src/utils/seedBadges');
const { initializeSocket } = require('./src/services/socketService');
const { initializeCronJobs } = require('./src/services/reminderService');
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');

// Use PORT from environment (Render sets this) with 5000 fallback
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Ensure DB is connected and models are initialized before loading app
    const connectDB = dbModule.connectDB || dbModule;
    await connectDB();

    // Seed badges (run only once or when needed)
    if (process.env.SEED_BADGES === 'true') {
      await seedBadges();
    }

    // Now require the app (routes/controllers can safely access db.models)
    const app = require('./src/app');

    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(` API URL: http://localhost:${PORT}/api`);
      console.log(` Health URL: http://localhost:${PORT}/health`);
    });

    // Initialize WebSocket
    initializeSocket(server);
    
    // Initialize Cron Jobs for reminders
    initializeCronJobs();

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.error(` Port ${PORT} is already in use!`);
        console.error('   Please use: npm run killport OR manually stop the process using port 5000');
        console.error('   Command to kill: npx kill-port 5000');
        process.exit(1);
      } else {
        console.error('HTTP server error:', err);
        process.exit(1);
      }
    });

    // Add clean shutdown handlers
    process.on('SIGINT', () => {
      console.log('\nSIGINT received, shutting down.');
      server.close(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      console.log('\nSIGTERM received, shutting down.');
      server.close(() => process.exit(0));
    });

    // After DB connection and model sync
    const adminJs = new AdminJS({
      databases: [dbModule.sequelize],
      rootPath: '/admin',
      resources: Object.values(dbModule.models),
      branding: {
        companyName: 'HerRaise Hub',
        logo: false,
        softwareBrothers: false
      }
    });

    // AdminJS authentication
    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
      authenticate: async (email, password) => {
        return (
          email === process.env.ADMIN_EMAIL &&
          password === process.env.ADMIN_PASSWORD
        ) ? { email } : null;
      },
      cookieName: 'adminjs',
      cookiePassword: process.env.JWT_SECRET || 'adminjs-cookie-secret'
    });

    app.use(adminJs.options.rootPath, adminRouter);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();