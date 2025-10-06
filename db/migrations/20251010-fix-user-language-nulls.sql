-- Update existing records with NULL language to the default 'en'
UPDATE "Users" SET language = 'en' WHERE language IS NULL;
