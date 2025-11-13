-- Add attachments support to forum posts
-- Run this migration to add file upload functionality

-- Add attachments column to ForumPosts table
ALTER TABLE "ForumPosts" 
ADD COLUMN IF NOT EXISTS "attachments" JSONB DEFAULT '[]';

-- Update the type enum to include 'feedback'
ALTER TYPE enum_ForumPosts_type ADD VALUE IF NOT EXISTS 'feedback';

-- Create index for better performance on attachments
CREATE INDEX IF NOT EXISTS "idx_forum_posts_attachments" ON "ForumPosts" USING GIN ("attachments");