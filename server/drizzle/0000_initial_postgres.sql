CREATE TYPE "user_role" AS ENUM ('user', 'admin');
CREATE TYPE "incident_type" AS ENUM ('fire', 'smoke', 'false_alarm');
CREATE TYPE "incident_status" AS ENUM ('reported', 'responding', 'contained', 'resolved');
CREATE TYPE "incident_severity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "team_status" AS ENUM ('active', 'inactive', 'on_duty');
CREATE TYPE "team_member_role" AS ENUM ('leader', 'member');
CREATE TYPE "emergency_contact_type" AS ENUM ('fire_department', 'police', 'ambulance', 'responder');
CREATE TYPE "notification_type" AS ENUM ('incident', 'sos', 'status_update', 'team_assignment');
CREATE TYPE "sos_alert_status" AS ENUM ('active', 'responded', 'cancelled');
--> statement-breakpoint
CREATE TABLE "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "email" varchar(320) NOT NULL,
  "password" text NOT NULL,
  "phone" varchar(20),
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admins" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "email" varchar(320) NOT NULL,
  "password" text NOT NULL,
  "phone" varchar(20),
  "role" "user_role" DEFAULT 'admin' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
  "id" serial PRIMARY KEY NOT NULL,
  "reporterId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "type" "incident_type" NOT NULL,
  "status" "incident_status" DEFAULT 'reported' NOT NULL,
  "latitude" numeric(10, 8) NOT NULL,
  "longitude" numeric(11, 8) NOT NULL,
  "address" text,
  "photoUrl" text,
  "severity" "incident_severity" DEFAULT 'medium' NOT NULL,
  "assignedTeamId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" "team_status" DEFAULT 'active' NOT NULL,
  "leaderId" integer NOT NULL,
  "memberCount" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teamMembers" (
  "id" serial PRIMARY KEY NOT NULL,
  "teamId" integer NOT NULL,
  "userId" integer NOT NULL,
  "role" "team_member_role" DEFAULT 'member' NOT NULL,
  "joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergencyContacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "email" varchar(320),
  "type" "emergency_contact_type" NOT NULL,
  "description" text,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text,
  "type" "notification_type" NOT NULL,
  "relatedIncidentId" integer,
  "isRead" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activityLog" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "action" varchar(255) NOT NULL,
  "relatedIncidentId" integer,
  "details" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sosAlerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "latitude" numeric(10, 8) NOT NULL,
  "longitude" numeric(11, 8) NOT NULL,
  "status" "sos_alert_status" DEFAULT 'active' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "respondedAt" timestamp
);
