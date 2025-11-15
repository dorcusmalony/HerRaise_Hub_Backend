const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTables() {
  try {
    // Check if ForumPosts table exists
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ForumPosts', 'ForumComments')
    `);
    
    console.log('📋 Existing forum tables:', tablesResult.rows);
    
    // Check ForumPosts structure if it exists
    if (tablesResult.rows.some(row => row.table_name === 'ForumPosts')) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ForumPosts'
      `);
      console.log('📋 ForumPosts columns:', columnsResult.rows);
      
      // Check existing posts
      const postsResult = await pool.query('SELECT COUNT(*) as count FROM "ForumPosts"');
      console.log('📊 Total posts in database:', postsResult.rows[0].count);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();