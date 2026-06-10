import pool from "./db";
import { ensureAuthSchema } from "./authSchema";

let schemaReady: Promise<void> | null = null;

export function ensureFireSchema() {
  schemaReady ??= createFireSchema();
  return schemaReady;
}

async function createEnum(name: string, values: string[]) {
  const quotedValues = values.map((value) => `'${value}'`).join(", ");

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE "${name}" AS ENUM (${quotedValues});
      END IF;
    END $$;
  `);

  for (const value of values) {
    await pool.query(`
      DO $$
      BEGIN
        ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '${value}';
      END $$;
    `);
  }
}

async function createFireSchema() {
  await ensureAuthSchema();

  await createEnum("incident_type", ["fire", "medical", "pulis"]);
  await createEnum("incident_status", [
    "submitted",
    "verified",
    "assigned",
    "team_dispatched",
    "en_route",
    "resolved",
    "archived_fake",
  ]);
  await createEnum("incident_severity", ["low", "medium", "high", "critical"]);
  await createEnum("team_status", ["available", "on_duty", "active"]);
  await createEnum("team_type", ["fire", "medical", "pulis"]);
  await createEnum("sos_alert_status", [
    "pending",
    "verified",
    "suspicious",
    "fake",
    "dispatched",
    "responding",
    "help_arrived",
    "resolved",
  ]);
  await createEnum("sos_emergency_type", ["police", "ambulance", "medical", "fire", "admin"]);
  await createEnum("emergency_contact_type", ["fire_department", "police", "ambulance", "responder"]);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "incidents" (
      "id" serial PRIMARY KEY,
      "reporter_id" integer NOT NULL DEFAULT 2,
      "title" varchar(255) NOT NULL,
      "description" text DEFAULT '',
      "type" "incident_type" NOT NULL DEFAULT 'fire',
      "latitude" numeric(10, 8) NOT NULL,
      "longitude" numeric(11, 8) NOT NULL,
      "address" text DEFAULT '',
      "photo_url" text,
      "severity" "incident_severity" NOT NULL DEFAULT 'medium',
      "status" "incident_status" NOT NULL DEFAULT 'submitted',
      "assigned_team_id" integer,
      "eta" varchar(120),
      "vehicle" varchar(120),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "reporter_id" integer NOT NULL DEFAULT 2;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "address" text DEFAULT '';
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "photo_url" text;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "assigned_team_id" integer;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "eta" varchar(120);
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "vehicle" varchar(120);
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "reporterId" integer NOT NULL DEFAULT 2;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "photoUrl" text;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "assignedTeamId" integer;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "incidents" ALTER COLUMN "reporterId" SET DEFAULT 2;
    ALTER TABLE "incidents" ALTER COLUMN "createdAt" SET DEFAULT now();
    ALTER TABLE "incidents" ALTER COLUMN "updatedAt" SET DEFAULT now();
    ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'submitted';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "teams" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text DEFAULT '',
      "type" "team_type" NOT NULL DEFAULT 'fire',
      "contact" varchar(40) DEFAULT '911',
      "vehicle" varchar(120) DEFAULT 'Pending vehicle',
      "leader_id" integer NOT NULL DEFAULT 1,
      "status" "team_status" NOT NULL DEFAULT 'available',
      "member_count" integer NOT NULL DEFAULT 0,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "type" "team_type" DEFAULT 'fire' NOT NULL;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "contact" varchar(40) DEFAULT '911';
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "vehicle" varchar(120) DEFAULT 'Pending vehicle';
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "leader_id" integer NOT NULL DEFAULT 1;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "member_count" integer NOT NULL DEFAULT 0;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "leaderId" integer NOT NULL DEFAULT 1;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "memberCount" integer NOT NULL DEFAULT 0;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "teams" ALTER COLUMN "leaderId" SET DEFAULT 1;
    ALTER TABLE "teams" ALTER COLUMN "memberCount" SET DEFAULT 0;
    ALTER TABLE "teams" ALTER COLUMN "createdAt" SET DEFAULT now();
    ALTER TABLE "teams" ALTER COLUMN "updatedAt" SET DEFAULT now();
    ALTER TABLE "teams" ALTER COLUMN "status" SET DEFAULT 'available';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "team_members" (
      "id" serial PRIMARY KEY,
      "team_id" integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
      "name" varchar(255) NOT NULL,
      "role" varchar(120) NOT NULL,
      "joined_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "deployments" (
      "id" serial PRIMARY KEY,
      "incident_id" integer NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
      "team_id" integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
      "assigned_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "sos_alerts" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL DEFAULT 2,
      "user_name" varchar(255) NOT NULL DEFAULT 'Citizen',
      "user_phone" varchar(40) NOT NULL DEFAULT 'Not provided',
      "emergency_type" "sos_emergency_type" NOT NULL DEFAULT 'fire',
      "incident_type" varchar(120),
      "description" text,
      "latitude" numeric(10, 8) NOT NULL,
      "longitude" numeric(11, 8) NOT NULL,
      "address" text DEFAULT 'Valencia City, Bukidnon',
      "photo_url" text,
      "notes" text,
      "priority" "incident_severity" NOT NULL DEFAULT 'critical',
      "status" "sos_alert_status" NOT NULL DEFAULT 'pending',
      "assigned_team" varchar(255),
      "eta" varchar(120),
      "resolution_notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "verified_at" timestamp,
      "dispatched_at" timestamp,
      "responding_at" timestamp,
      "arrived_at" timestamp,
      "resolved_at" timestamp
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "activity_log" (
      "id" serial PRIMARY KEY,
      "action" varchar(255) NOT NULL,
      "related_incident_id" integer,
      "details" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "emergency_contacts" (
      "id" serial PRIMARY KEY,
      "type" "emergency_contact_type" NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "phone" varchar(40) NOT NULL,
      "email" varchar(320),
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "safe_locations" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text,
      "type" varchar(120) NOT NULL DEFAULT 'evacuation_zone',
      "latitude" numeric(10, 8) NOT NULL,
      "longitude" numeric(11, 8) NOT NULL,
      "address" text,
      "capacity" integer,
      "amenities" text,
      "contact_person" varchar(255),
      "contact_phone" varchar(40),
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await seedFireData();
}

async function seedFireData() {
  await pool.query(`
    INSERT INTO "teams" ("name", "description", "type", "contact", "vehicle", "leader_id", "status", "member_count")
    VALUES
      ('Fire Brigade Alpha', 'Primary response team for active fire calls.', 'fire', '0917-555-0119', 'Engine 07', 1, 'on_duty', 3),
      ('Medical Support Unit', 'First aid and ambulance coordination.', 'medical', '0917-555-0120', 'Ambulance 03', 1, 'available', 1)
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO "team_members" ("team_id", "name", "role")
    SELECT 1, 'Capt. Reyes', 'Team Lead'
    WHERE EXISTS (SELECT 1 FROM "teams" WHERE "id" = 1)
      AND NOT EXISTS (SELECT 1 FROM "team_members" WHERE "team_id" = 1 AND "name" = 'Capt. Reyes');

    INSERT INTO "team_members" ("team_id", "name", "role")
    SELECT 1, 'Mika Santos', 'Firefighter'
    WHERE EXISTS (SELECT 1 FROM "teams" WHERE "id" = 1)
      AND NOT EXISTS (SELECT 1 FROM "team_members" WHERE "team_id" = 1 AND "name" = 'Mika Santos');

    INSERT INTO "team_members" ("team_id", "name", "role")
    SELECT 1, 'Jon Delos Cruz', 'Driver'
    WHERE EXISTS (SELECT 1 FROM "teams" WHERE "id" = 1)
      AND NOT EXISTS (SELECT 1 FROM "team_members" WHERE "team_id" = 1 AND "name" = 'Jon Delos Cruz');

    INSERT INTO "team_members" ("team_id", "name", "role")
    SELECT 2, 'Ana Lim', 'Medic'
    WHERE EXISTS (SELECT 1 FROM "teams" WHERE "id" = 2)
      AND NOT EXISTS (SELECT 1 FROM "team_members" WHERE "team_id" = 2 AND "name" = 'Ana Lim');
  `);

  await pool.query(`
    INSERT INTO "incidents" ("reporter_id", "title", "description", "type", "latitude", "longitude", "address", "severity", "status", "assigned_team_id", "eta", "vehicle")
    SELECT 2, 'Residential fire near Barangay Hall', 'Visible flames reported by nearby residents.', 'fire', 14.5995, 120.9842, 'Manila City Hall area', 'medium', 'en_route', 1, '6 minutes', 'Engine 07'
    WHERE NOT EXISTS (SELECT 1 FROM "incidents");

    INSERT INTO "incidents" ("reporter_id", "title", "description", "type", "latitude", "longitude", "address", "severity", "status")
    SELECT 2, 'Medical assistance request', 'Resident needs emergency medical response after smoke exposure.', 'medical', 14.6042, 120.9822, 'Sampaloc, Manila', 'high', 'submitted'
    WHERE (SELECT COUNT(*) FROM "incidents") < 2;
  `);

  await pool.query(`
    INSERT INTO "activity_log" ("action")
    SELECT 'New incident report received'
    WHERE NOT EXISTS (SELECT 1 FROM "activity_log" WHERE "action" = 'New incident report received');

    INSERT INTO "activity_log" ("action")
    SELECT 'Fire Brigade Alpha dispatched'
    WHERE NOT EXISTS (SELECT 1 FROM "activity_log" WHERE "action" = 'Fire Brigade Alpha dispatched');
  `);

  await pool.query(`
    INSERT INTO "emergency_contacts" ("type", "name", "description", "phone", "email")
    VALUES
      ('fire_department', 'Fire Responder', 'Fire response team and incident support', '911', 'bfp@example.com'),
      ('police', 'Police Responder', 'Police support and public safety response', '911', 'police@example.com'),
      ('ambulance', 'Medical Responder', 'Medical emergency and ambulance dispatch', '911', 'ems@example.com')
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO "safe_locations" ("name", "description", "type", "latitude", "longitude", "address", "capacity", "amenities", "contact_person", "contact_phone")
    SELECT * FROM (VALUES
      ('Valencia City Sports Complex', 'Main evacuation center with medical facilities', 'evacuation_zone', 8.2275::numeric, 125.1542::numeric, 'Valencia City, Bukidnon', 5000, 'Medical clinic, water, food, restrooms', 'Mr. Garcia', '0917-123-4567'),
      ('City Hospital Emergency Relief', 'Medical facility for injured persons', 'hospital', 8.2305::numeric, 125.1555::numeric, 'Hospital Road, Valencia City', 500, 'Emergency room, medical staff, ambulance parking', 'Dr. Santos', '0917-234-5678'),
      ('Barangay Community Center', 'Secondary evacuation shelter', 'shelter', 8.2245::numeric, 125.1525::numeric, 'Barangay Hall, Valencia City', 2000, 'Toilets, water stations, first aid kit', 'Brgy. Captain', '0917-345-6789'),
      ('Elementary School Grounds', 'Safe area for families and children', 'evacuation_zone', 8.2350::numeric, 125.1480::numeric, 'School Road, Valencia City', 3000, 'Open ground, shelter, water', 'Principal Torres', '0917-456-7890'),
      ('Public Park Safe Zone', 'Open area for temporary evacuation', 'evacuation_zone', 8.2200::numeric, 125.1600::numeric, 'Park Avenue, Valencia City', 4000, 'Open space, basic facilities', 'Park Manager', '0917-567-8901')
    ) AS data("name", "description", "type", "latitude", "longitude", "address", "capacity", "amenities", "contact_person", "contact_phone")
    WHERE NOT EXISTS (SELECT 1 FROM "safe_locations");
  `);
}
