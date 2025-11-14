const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createForumTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        title_ar VARCHAR(255),
        content_ar TEXT,
        type VARCHAR(20) DEFAULT 'discussion' CHECK (type IN ('discussion', 'question', 'announcement')),
        category VARCHAR(30) CHECK (category IN ('personal-growth', 'mental-health', 'education-study', 'career-future')),
        tags JSON DEFAULT '[]',
        attachments JSON DEFAULT '[]',
        likes JSON DEFAULT '[]',
        views INTEGER DEFAULT 0,
        viewers JSON DEFAULT '[]',
        author_id UUID NOT NULL,
        is_locked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        content_ar TEXT,
        post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        author_id UUID NOT NULL,
        parent_comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
        likes JSON DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log(' Forum tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error(' Error creating tables:', error);
    process.exit(1);
  }
}

createForumTables();