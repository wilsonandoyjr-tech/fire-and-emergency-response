import pool from "./db";

let schemaReady: Promise<void> | null = null;

export function ensureAuthSchema() {
  schemaReady ??= createAuthSchema();
  return schemaReady;
}

async function createAuthSchema() {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE "user_role" AS ENUM ('fire', 'medical', 'pulis', 'admin');
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'fire';
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'medical';
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'pulis';
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'admin';
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY,
      "full_name" varchar(255),
      "email" varchar(320),
      "password" text,
      "phone" varchar(20),
      "role" "user_role" DEFAULT 'fire' NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "admins" (
      "id" serial PRIMARY KEY,
      "full_name" varchar(255) NOT NULL,
      "email" varchar(320) NOT NULL,
      "password" text NOT NULL,
      "phone" varchar(20),
      "role" "user_role" DEFAULT 'admin' NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(255);
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'fire' NOT NULL;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'fire';

    ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
    ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
    ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'openId'
      ) THEN
        ALTER TABLE "users" ALTER COLUMN "openId" DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) THEN
        ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'full_name'
      ) THEN
        ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
      ) THEN
        ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_unique'
      ) THEN
        ALTER TABLE "admins" ADD CONSTRAINT "admins_email_unique" UNIQUE ("email");
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
      ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
      END IF;
    EXCEPTION
      WHEN duplicate_table THEN
        NULL;
      WHEN unique_violation THEN
        NULL;
    END $$;
  `);

  await pool.query(`
    INSERT INTO "users" ("full_name", "email", "password", "phone", "role")
    VALUES
      ('Fire Responder', 'fire@example.com', 'fire123', '0917-100-0001', 'fire'),
      ('Medical Responder', 'medical@example.com', 'medical123', '0917-100-0002', 'medical'),
      ('Pulis Responder', 'pulis@example.com', 'pulis123', '0917-100-0003', 'pulis')
    ON CONFLICT ("email") DO UPDATE SET
      "full_name" = EXCLUDED."full_name",
      "password" = EXCLUDED."password",
      "phone" = EXCLUDED."phone",
      "role" = EXCLUDED."role",
      "updatedAt" = now();
  `);

  await pool.query(`
    INSERT INTO "admins" ("full_name", "email", "password", "phone", "role")
    VALUES ('System Admin', 'admin@example.com', 'admin123', '0917-100-0000', 'admin')
    ON CONFLICT ("email") DO UPDATE SET
      "full_name" = EXCLUDED."full_name",
      "password" = EXCLUDED."password",
      "phone" = EXCLUDED."phone",
      "role" = EXCLUDED."role",
      "updatedAt" = now();
  `);
}
