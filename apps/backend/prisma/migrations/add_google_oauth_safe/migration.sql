-- Add googleId column (nullable and unique)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- Create unique index on googleId
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- Make password column nullable (safe because existing users already have passwords)
-- This is safe because:
-- 1. Existing users already have passwords (they won't be null)
-- 2. New OAuth users will have googleId but no password
-- 3. The application logic handles both cases
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
