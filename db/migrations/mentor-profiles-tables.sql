-- Create MentorProfiles table for mentor-specific information

CREATE TABLE IF NOT EXISTS "MentorProfiles" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "expertise" JSONB DEFAULT '[]',
  "bio" TEXT,
  "professionalTitle" VARCHAR(255),
  "organization" VARCHAR(255),
  "availabilityHours" JSONB DEFAULT '{"monday":[],"tuesday":[],"wednesday":[],"thursday":[],"friday":[],"saturday":[],"sunday":[]}',
  "maxMentees" INTEGER DEFAULT 5,
  "linkedinProfile" VARCHAR(255),
  "educationHistory" JSONB DEFAULT '[]',
  "workHistory" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add mentor-specific fields to Users table if they don't exist
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS "yearsOfExperience" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verificationDate" TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_mentor_profiles_user_id" ON "MentorProfiles"("userId");
