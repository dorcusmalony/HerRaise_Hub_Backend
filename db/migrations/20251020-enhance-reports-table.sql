-- Update Reports table for safety reporting

-- First, create the enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type_enum') THEN
        CREATE TYPE report_type_enum AS ENUM ('harassment', 'abuse', 'technical', 'unsafe', 'other');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level_enum') THEN
        CREATE TYPE urgency_level_enum AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_enum') THEN
        CREATE TYPE report_status_enum AS ENUM ('open', 'in-review', 'resolved', 'dismissed');
    END IF;
END$$;

-- Then, update the Reports table
ALTER TABLE "Reports"
    ALTER COLUMN "type" TYPE report_type_enum USING "type"::report_type_enum,
    ALTER COLUMN "status" TYPE report_status_enum USING "status"::report_status_enum,
    ADD COLUMN IF NOT EXISTS "urgencyLevel" urgency_level_enum DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "relatedUserIds" JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_reports_type" ON "Reports"("type");
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "Reports"("status");
CREATE INDEX IF NOT EXISTS "idx_reports_urgency" ON "Reports"("urgencyLevel");
