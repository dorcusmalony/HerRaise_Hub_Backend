-- Create Reports table for tracking user reports

-- First, create the enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type_enum') THEN
        CREATE TYPE report_type_enum AS ENUM ('harassment', 'abuse', 'technical', 'other');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_enum') THEN
        CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewed', 'resolved');
    END IF;
END$$;

-- Create Reports table
CREATE TABLE IF NOT EXISTS "Reports" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  "type" report_type_enum NOT NULL,
  "description" TEXT NOT NULL,
  "status" report_status_enum DEFAULT 'pending' NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_reports_user_id" ON "Reports"("userId");
CREATE INDEX IF NOT EXISTS "idx_reports_type" ON "Reports"("type");
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "Reports"("status");
