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
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'user' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admins_email_unique'
  ) THEN
    ALTER TABLE "admins" ADD CONSTRAINT "admins_email_unique" UNIQUE ("email");
  END IF;
END $$;
