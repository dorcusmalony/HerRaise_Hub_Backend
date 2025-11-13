-- Create scholarship and notification system tables
-- Run this migration to add scholarship functionality

-- Create Scholarships table
CREATE TABLE IF NOT EXISTS "Scholarships" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('scholarship', 'internship', 'competition')),
    "deadline" TIMESTAMP WITH TIME ZONE NOT NULL,
    "amount" VARCHAR(255),
    "eligibility" TEXT,
    "applicationUrl" VARCHAR(500),
    "isActive" BOOLEAN DEFAULT true,
    "postedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY ("postedBy") REFERENCES "Users"("id") ON DELETE CASCADE
);

-- Create ScholarshipApplications table
CREATE TABLE IF NOT EXISTS "ScholarshipApplications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "scholarshipId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending' CHECK ("status" IN ('pending', 'submitted', 'under_review', 'accepted', 'rejected')),
    "notes" TEXT,
    "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY ("scholarshipId") REFERENCES "Scholarships"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE,
    UNIQUE("scholarshipId", "userId")
);

-- Create Notifications table
CREATE TABLE IF NOT EXISTS "Notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('scholarship', 'application_update', 'deadline_reminder')),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" UUID,
    "isRead" BOOLEAN DEFAULT false,
    "link" VARCHAR(500),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_scholarships_type" ON "Scholarships"("type");
CREATE INDEX IF NOT EXISTS "idx_scholarships_deadline" ON "Scholarships"("deadline");
CREATE INDEX IF NOT EXISTS "idx_scholarships_active" ON "Scholarships"("isActive");
CREATE INDEX IF NOT EXISTS "idx_applications_user" ON "ScholarshipApplications"("userId");
CREATE INDEX IF NOT EXISTS "idx_applications_scholarship" ON "ScholarshipApplications"("scholarshipId");
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "Notifications"("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "Notifications"("isRead");