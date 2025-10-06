-- Fix all NULL values in required columns
UPDATE "Users" 
SET 
    language = COALESCE(language, 'en'),
    "phoneNumber" = COALESCE("phoneNumber", '+211900000000'),
    "educationLevel" = COALESCE("educationLevel", 'secondary'),
    "isActive" = COALESCE("isActive", true),
    "totalPoints" = COALESCE("totalPoints", 0),
    "level" = COALESCE("level", 1)
WHERE 
    language IS NULL 
    OR "phoneNumber" IS NULL
    OR "educationLevel" IS NULL
    OR "isActive" IS NULL
    OR "totalPoints" IS NULL
    OR "level" IS NULL;
