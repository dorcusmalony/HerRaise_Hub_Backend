-- Update existing records with NULL phoneNumber to the default value
UPDATE "Users" SET "phoneNumber" = '+211900000000' WHERE "phoneNumber" IS NULL;
