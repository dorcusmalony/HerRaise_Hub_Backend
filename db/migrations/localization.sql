
-- Update Users table language enum to support only en/ar
ALTER TABLE "Users" ALTER COLUMN language TYPE VARCHAR(5);
UPDATE "Users" SET language = 'en' WHERE language NOT IN ('en', 'ar');

-- Add Arabic columns to ForumPosts if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ForumPosts' AND column_name = 'title_ar') THEN
        ALTER TABLE "ForumPosts" ADD COLUMN title_ar VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ForumPosts' AND column_name = 'content_ar') THEN
        ALTER TABLE "ForumPosts" ADD COLUMN content_ar TEXT;
    END IF;
END $$;

-- Add Arabic columns to ShareZones if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ShareZones' AND column_name = 'title_ar') THEN
        ALTER TABLE "ShareZones" ADD COLUMN title_ar VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ShareZones' AND column_name = 'content_ar') THEN
        ALTER TABLE "ShareZones" ADD COLUMN content_ar TEXT;
    END IF;
END $$;

-- Create SystemTranslations table for static content
CREATE TABLE IF NOT EXISTS "SystemTranslations" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    en TEXT NOT NULL,
    ar TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_language ON "Users"(language);
CREATE INDEX IF NOT EXISTS idx_system_translations_key ON "SystemTranslations"(key);
CREATE INDEX IF NOT EXISTS idx_system_translations_category ON "SystemTranslations"(category);

-- Insert basic system translations
INSERT INTO "SystemTranslations" (key, en, ar, category) VALUES
-- Navigation
('nav.home', 'Home', 'الرئيسية', 'navigation'),
('nav.forum', 'Forum', 'المنتدى', 'navigation'),
('nav.opportunities', 'Opportunities', 'الفرص', 'navigation'),
('nav.resources', 'Resources', 'الموارد', 'navigation'),
('nav.sharezone', 'ShareZone', 'منطقة المشاركة', 'navigation'),
('nav.profile', 'Profile', 'الملف الشخصي', 'navigation'),

-- Forum Categories
('forum.mental-health', 'Mental Health', 'الصحة النفسية', 'forum'),
('forum.leadership', 'Leadership', 'القيادة', 'forum'),
('forum.education-study', 'Education & Study', 'التعليم والدراسة', 'forum'),
('forum.equality-rights', 'Equality & Rights', 'المساواة والحقوق', 'forum'),
('forum.career-skills', 'Career & Skills', 'المهنة والمهارات', 'forum'),
('forum.womens-health', 'Women''s Health', 'صحة المرأة', 'forum'),

-- ShareZone Categories
('sharezone.essays', 'Essays', 'المقالات', 'sharezone'),
('sharezone.projects', 'Projects', 'المشاريع', 'sharezone'),
('sharezone.videos', 'Videos', 'الفيديوهات', 'sharezone'),
('sharezone.resumes', 'Resumes', 'السير الذاتية', 'sharezone'),
('sharezone.cover-letters', 'Cover Letters', 'خطابات التغطية', 'sharezone'),

-- Opportunity Types
('opportunity.internship', 'Internship', 'تدريب', 'opportunities'),
('opportunity.scholarship', 'Scholarship', 'منحة دراسية', 'opportunities'),
('opportunity.event', 'Event', 'حدث', 'opportunities'),
('opportunity.job', 'Job', 'وظيفة', 'opportunities'),
('opportunity.workshop', 'Workshop', 'ورشة عمل', 'opportunities'),
('opportunity.competition', 'Competition', 'مسابقة', 'opportunities'),

-- Common Actions
('action.save', 'Save', 'حفظ', 'actions'),
('action.cancel', 'Cancel', 'إلغاء', 'actions'),
('action.edit', 'Edit', 'تعديل', 'actions'),
('action.delete', 'Delete', 'حذف', 'actions'),
('action.submit', 'Submit', 'إرسال', 'actions'),
('action.search', 'Search', 'بحث', 'actions')
ON CONFLICT (key) DO NOTHING;