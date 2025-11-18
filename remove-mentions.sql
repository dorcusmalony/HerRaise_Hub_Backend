-- Remove mentions column from forum_comments if it exists
ALTER TABLE forum_comments DROP COLUMN IF EXISTS mentions;

-- Remove mentions column from forum_posts if it exists  
ALTER TABLE forum_posts DROP COLUMN IF EXISTS mentions;