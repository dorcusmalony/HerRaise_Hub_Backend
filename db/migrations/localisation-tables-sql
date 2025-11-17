-- Add language columns to all content tables
ALTER TABLE opportunities ADD COLUMN language VARCHAR(5) DEFAULT 'en';
ALTER TABLE opportunities ADD COLUMN title_ar TEXT;
ALTER TABLE opportunities ADD COLUMN description_ar TEXT;
ALTER TABLE opportunities ADD COLUMN requirements_ar TEXT;

ALTER TABLE resources ADD COLUMN language VARCHAR(5) DEFAULT 'en';
ALTER TABLE resources ADD COLUMN title_ar VARCHAR(255);
ALTER TABLE resources ADD COLUMN description_ar TEXT;
ALTER TABLE resources ADD COLUMN content_ar TEXT;

ALTER TABLE scholarships ADD COLUMN language VARCHAR(5) DEFAULT 'en';
ALTER TABLE scholarships ADD COLUMN title_ar VARCHAR(255);
ALTER TABLE scholarships ADD COLUMN description_ar TEXT;
ALTER TABLE scholarships ADD COLUMN requirements_ar TEXT;

ALTER TABLE notifications ADD COLUMN language VARCHAR(5) DEFAULT 'en';
ALTER TABLE notifications ADD COLUMN title_ar VARCHAR(255);
ALTER TABLE notifications ADD COLUMN message_ar TEXT;

-- Update translations table for all entity types
DROP TABLE IF EXISTS translations;
CREATE TABLE translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type ENUM('opportunity', 'resource', 'scholarship', 'notification', 'post', 'comment'),
  entity_id INT,
  language VARCHAR(5),
  field_name VARCHAR(50),
  translated_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);