require('dotenv').config();
// Enforce Postgres-only usage for this codebase
process.env.DB_TYPE = 'postgres';
const dbModule = require('./src/config/database');
const seedBadges = require('./src/utils/seedBadges');
const { initializeSocket } = require('./src/services/socketService');
const { initializeCronJobs } = require('./src/services/reminderService');
const { initializeReminderCrons } = require('./src/services/applicationReminderService');
const ReminderService = require('./src/services/reminderService');

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

    // AdminJS temporarily disabled due to configuration issues
    console.log('⚠️ AdminJS disabled - use API endpoints for admin tasks');

    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(` API URL: http://localhost:${PORT}/api`);
      console.log(` Health URL: http://localhost:${PORT}/health`);
    });

    // Initialize WebSocket
    initializeSocket(server);
    
    // Initialize Cron Jobs for reminders
    if (typeof initializeCronJobs === 'function') {
      initializeCronJobs();
    }
    
    // Initialize Application Reminder Crons
    if (typeof initializeReminderCrons === 'function') {
      initializeReminderCrons();
    }
    
    // Start deadline reminder scheduler
    ReminderService.startReminderScheduler();

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

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();