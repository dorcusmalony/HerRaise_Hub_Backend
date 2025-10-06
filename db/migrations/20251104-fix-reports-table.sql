-- Fix Reports table enum type issues by recreating it with standard column types

-- Create a backup of reports data if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Reports') THEN
        CREATE TEMP TABLE reports_backup AS SELECT * FROM "Reports";
    END IF;
END$$;

-- Drop the existing table and related enum types
DROP TABLE IF EXISTS "Reports" CASCADE;
DROP TYPE IF EXISTS report_type_enum CASCADE;
DROP TYPE IF EXISTS report_status_enum CASCADE;
DROP TYPE IF EXISTS urgency_level_enum CASCADE;
DROP TYPE IF EXISTS enum_Reports_type CASCADE;
DROP TYPE IF EXISTS enum_Reports_status CASCADE;

-- Recreate the Reports table with standard types instead of enums
CREATE TABLE "Reports" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reporterId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  "assignedToId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  "type" VARCHAR(50) NOT NULL DEFAULT 'other',
  "description" TEXT NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "urgencyLevel" VARCHAR(50) DEFAULT 'medium',
  "isAnonymous" BOOLEAN DEFAULT FALSE,
  "relatedUserIds" JSONB DEFAULT '[]',
  "location" VARCHAR(255),
  "contact" VARCHAR(255),
  "metadata" JSONB DEFAULT '{}',
  "notifiedAt" TIMESTAMP WITH TIME ZONE,
  "resolvedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add check constraints to limit values (mimicking enum behavior)
ALTER TABLE "Reports"
    ADD CONSTRAINT chk_report_type 
    CHECK ("type" IN ('harassment', 'abuse', 'technical', 'unsafe', 'other'));

ALTER TABLE "Reports"
    ADD CONSTRAINT chk_report_status 
    CHECK ("status" IN ('pending', 'reviewed', 'resolved', 'open', 'in-review', 'dismissed'));

ALTER TABLE "Reports"
    ADD CONSTRAINT chk_urgency_level 
    CHECK ("urgencyLevel" IN ('low', 'medium', 'high', 'critical'));

-- Create indexes for better query performance
CREATE INDEX "idx_reports_reporter_id" ON "Reports"("reporterId");
CREATE INDEX "idx_reports_type" ON "Reports"("type");
CREATE INDEX "idx_reports_status" ON "Reports"("status");
CREATE INDEX "idx_reports_urgency" ON "Reports"("urgencyLevel");

-- Restore data if the backup table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reports_backup') THEN
        INSERT INTO "Reports" 
        SELECT * FROM reports_backup
        ON CONFLICT (id) DO NOTHING;
    END IF;
END$$;
