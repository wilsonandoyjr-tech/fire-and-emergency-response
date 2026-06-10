ALTER TYPE "incident_type" ADD VALUE IF NOT EXISTS 'medical';

ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'team_dispatched';
ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'en_route';
ALTER TYPE "incident_status" ADD VALUE IF NOT EXISTS 'archived_fake';

ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'submitted';
UPDATE "incidents"
SET "status" = CASE
  WHEN "status"::text = 'pending' THEN 'submitted'::incident_status
  WHEN "status"::text = 'in_progress' THEN 'team_dispatched'::incident_status
  ELSE "status"
END;

ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "eta" varchar(120);
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "vehicle" varchar(120);

DO $$
BEGIN
  CREATE TYPE "team_type" AS ENUM ('fire', 'medical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "type" "team_type" DEFAULT 'fire' NOT NULL;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "contact" varchar(40);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "vehicle" varchar(120);

CREATE TABLE IF NOT EXISTS "incident_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "incident_id" integer NOT NULL,
  "status" incident_status NOT NULL,
  "updated_by" integer,
  "timestamp" timestamp DEFAULT now() NOT NULL
);
