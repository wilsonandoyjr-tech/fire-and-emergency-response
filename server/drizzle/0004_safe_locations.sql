-- Create safeLocations table for evacuation zones and safe places during emergencies
CREATE TABLE IF NOT EXISTS "safeLocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "type" varchar(120) DEFAULT 'evacuation_zone' NOT NULL,
  "latitude" numeric(10, 8) NOT NULL,
  "longitude" numeric(11, 8) NOT NULL,
  "address" text,
  "capacity" integer,
  "amenities" text,
  "contactPerson" varchar(255),
  "contactPhone" varchar(20),
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_safeLocations_latitude_longitude" ON "safeLocations"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "idx_safeLocations_isActive" ON "safeLocations"("isActive");
