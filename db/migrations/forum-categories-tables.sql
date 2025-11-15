-- Add category column to forum posts
ALTER TABLE forum_posts 
ADD COLUMN category VARCHAR(50) NULL;

-- Add index for better query performance
CREATE INDEX idx_forum_posts_category ON forum_posts(category);

-- Update existing posts to have null category (optional)
UPDATE forum_posts SET category = NULL WHERE category IS NULL;