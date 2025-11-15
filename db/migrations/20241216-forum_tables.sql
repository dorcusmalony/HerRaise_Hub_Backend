-- Create ForumPosts table
CREATE TABLE IF NOT EXISTS "ForumPosts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'discussion' CHECK (type IN ('discussion', 'question', 'announcement')),
  category VARCHAR(30) CHECK (category IN ('personal-growth', 'mental-health', 'education-study', 'career-future')),
  tags JSONB DEFAULT '[]',
  likes JSONB DEFAULT '[]',
  views INTEGER DEFAULT 0,
  viewers JSONB DEFAULT '[]',
  "authorId" UUID NOT NULL,
  "isLocked" BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ForumComments table
CREATE TABLE IF NOT EXISTS "ForumComments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  "postId" UUID NOT NULL REFERENCES "ForumPosts"(id) ON DELETE CASCADE,
  "authorId" UUID NOT NULL,
  "parentCommentId" UUID REFERENCES "ForumComments"(id) ON DELETE CASCADE,
  likes JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON "ForumPosts"(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON "ForumPosts"("authorId");
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON "ForumPosts"("createdAt");
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON "ForumComments"("postId");
CREATE INDEX IF NOT EXISTS idx_forum_comments_author ON "ForumComments"("authorId");