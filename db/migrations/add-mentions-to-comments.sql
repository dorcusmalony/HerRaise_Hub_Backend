-- Add mentions column to forum_comments table
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS mentions JSON DEFAULT '[]';