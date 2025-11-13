-- Add language columns to existing tables
ALTER TABLE forum_posts ADD COLUMN language VARCHAR(5) DEFAULT 'en';
ALTER TABLE forum_comments ADD COLUMN language VARCHAR(5) DEFAULT 'en';
ALTER TABLE opportunities ADD COLUMN language VARCHAR(5) DEFAULT 'en';

-- Add preferred language to users table
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';

-- Create translations table
CREATE TABLE translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type ENUM('post', 'comment', 'opportunity'),
  entity_id INT,
  language VARCHAR(5),
  field_name VARCHAR(50),
  translated_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);