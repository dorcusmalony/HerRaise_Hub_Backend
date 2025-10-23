-- Add essay and video post types to ForumPosts
-- Run this migration to support new post types

-- Add new values to the enum type
ALTER TYPE enum_ForumPosts_type ADD VALUE IF NOT EXISTS 'essay';
ALTER TYPE enum_ForumPosts_type ADD VALUE IF NOT EXISTS 'video';