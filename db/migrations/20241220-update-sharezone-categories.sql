-- Update ShareZone categories enum
ALTER TABLE share_zones 
DROP CONSTRAINT IF EXISTS share_zones_category_check;

ALTER TABLE share_zones 
ADD CONSTRAINT share_zones_category_check 
CHECK (category IN ('essays', 'projects', 'videos', 'resumes', 'cover-letters'));