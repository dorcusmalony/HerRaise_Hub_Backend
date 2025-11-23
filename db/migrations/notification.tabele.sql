-- Fix notification enum types
-- Add missing enum values for notifications

ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'post_comment';
ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'forum_reply';
ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'comment_reply';
ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'comment_like';
ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'post_like';
ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'new_post';
ALTER TYPE enum_Notifications_type ADD VALUE IF NOT EXISTS 'deadline_reminder';