
const db = require('./src/config/database');

async function clearCache() {
  try {
    console.log('Clearing Sequelize model cache...');
    
    // Close existing connections
    await db.sequelize.close();
    
    
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/models/') || key.includes('\\models\\')) {
        delete require.cache[key];
      }
    });
    
    console.log('Cache cleared. Please restart the server.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();