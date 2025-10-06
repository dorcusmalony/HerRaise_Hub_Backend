-- Fix Reports table type column issue

-- First check if the table exists
DO $$
BEGIN
    -- If Reports table exists but has incorrect column type
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Reports') THEN
        -- Temporarily drop constraints if they exist
        ALTER TABLE IF EXISTS "Reports" ALTER COLUMN "type" DROP DEFAULT;
        
        -- Update any existing records to have a valid enum value
        UPDATE "Reports" SET "type" = 'other' WHERE "type" IS NULL OR "type" NOT IN ('harassment', 'abuse', 'technical', 'other');
        
        -- Now convert the column to use the enum
        ALTER TABLE IF EXISTS "Reports" 
            ALTER COLUMN "type" TYPE report_type_enum 
            USING "type"::report_type_enum;
            
        -- Restore the default value
        ALTER TABLE IF EXISTS "Reports" ALTER COLUMN "type" SET DEFAULT 'other'::report_type_enum;
    END IF;
END $$;
