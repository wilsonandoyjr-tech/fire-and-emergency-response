ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE "team_status" ADD VALUE IF NOT EXISTS 'available';

ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'pending';
UPDATE "incidents"
SET "status" = CASE
  WHEN "status"::text = 'reported' THEN 'pending'::incident_status
  WHEN "status"::text IN ('responding', 'contained') THEN 'in_progress'::incident_status
  ELSE "status"
END;
ALTER TABLE "teams" ALTER COLUMN "status" SET DEFAULT 'available';
UPDATE "teams" SET "status" = 'available'::team_status WHERE "status"::text = 'inactive';

CREATE TABLE IF NOT EXISTS "deployments" (
  "id" serial PRIMARY KEY NOT NULL,
  "incident_id" integer NOT NULL,
  "team_id" integer NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "teamMembers" ADD COLUMN IF NOT EXISTS "name" varchar(255);
UPDATE "teamMembers" SET "name" = CONCAT('Member ', "id") WHERE "name" IS NULL;
ALTER TABLE "teamMembers" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "teamMembers" ALTER COLUMN "role" TYPE varchar(120) USING "role"::text;
