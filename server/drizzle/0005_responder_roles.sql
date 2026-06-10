ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'fire';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'medical';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'pulis';

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'fire';
