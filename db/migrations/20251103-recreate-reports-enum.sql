-- Recreate Reports table with proper enum types

-- Backup existing data
CREATE TEMP TABLE reports_backup AS
SELECT * FROM "Reports";

-- Drop the existing table
DROP TABLE IF EXISTS "Reports";

-- Recreate the enum types
DROP TYPE IF EXISTS report_type_enum;
CREATE TYPE report_type_enum AS ENUM ('harassment', 'abuse', 'technical', 'other');

DROP TYPE IF EXISTS report_status_enum;
CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewed', 'resolved');

-- Recreate the Reports table
CREATE TABLE "Reports" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reporterId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  "assignedToId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  "type" report_type_enum NOT NULL DEFAULT 'other',
  "description" TEXT NOT NULL,
  "status" report_status_enum NOT NULL DEFAULT 'pending',
  "location" VARCHAR(255),
  "contact" VARCHAR(255),
  "metadata" JSONB DEFAULT '{}',
  "resolvedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Restore data (insert only columns that exist in both tables)
INSERT INTO "Reports" ("id", "reporterId", "assignedToId", "description", "location", "contact", "resolvedAt", "createdAt", "updatedAt", "metadata")
SELECT "id", "reporterId", "assignedToId", "description", "location", "contact", "resolvedAt", "createdAt", "updatedAt", "metadata"
FROM reports_backup;

-- Update the type and status columns with fallback values
UPDATE "Reports" SET "type" = 'other', "status" = 'pending';

-- Create indexes for better query performance
CREATE INDEX "idx_reports_reporter_id" ON "Reports"("reporterId");
CREATE INDEX "idx_reports_type" ON "Reports"("type");
CREATE INDEX "idx_reports_status" ON "Reports"("status");
