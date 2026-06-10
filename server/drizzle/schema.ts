import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["fire", "medical", "pulis", "admin"]);
export const incidentTypeEnum = pgEnum("incident_type", ["fire", "medical", "pulis"]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "submitted",
  "verified",
  "assigned",
  "team_dispatched",
  "en_route",
  "resolved",
  "archived_fake",
]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["low", "medium", "high", "critical"]);
export const teamStatusEnum = pgEnum("team_status", ["available", "on_duty", "active"]);
export const teamTypeEnum = pgEnum("team_type", ["fire", "medical", "pulis"]);
export const teamMemberRoleEnum = pgEnum("team_member_role", ["leader", "member"]);
export const emergencyContactTypeEnum = pgEnum("emergency_contact_type", [
  "fire_department",
  "police",
  "ambulance",
  "responder",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "incident",
  "sos",
  "status_update",
  "team_assignment",
]);
export const sosAlertStatusEnum = pgEnum("sos_alert_status", [
  "pending",
  "verified",
  "suspicious",
  "fake",
  "dispatched",
  "responding",
  "help_arrived",
  "resolved",
]);
export const sosEmergencyTypeEnum = pgEnum("sos_emergency_type", ["police", "ambulance", "medical", "fire", "admin"]);

/**
 * User signup table for citizens who report incidents and receive alerts.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password").notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").default("fire").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Admin signup table matching the admin role selected in the signup form.
 */
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password").notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").default("admin").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

/**
 * Incidents table for fire/medical reports with location and status tracking.
 */
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: incidentTypeEnum("type").notNull(),
  status: incidentStatusEnum("status").default("submitted").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  location: text("location"),
  photoUrl: text("photoUrl"), // Storage URL
  severity: incidentSeverityEnum("severity").default("medium").notNull(),
  assignedTeamId: integer("assignedTeamId"),
  eta: varchar("eta", { length: 120 }),
  vehicle: varchar("vehicle", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

/**
 * Teams table for admin team management and incident response coordination.
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: teamTypeEnum("type").default("fire").notNull(),
  contact: varchar("contact", { length: 40 }),
  vehicle: varchar("vehicle", { length: 120 }),
  status: teamStatusEnum("status").default("available").notNull(),
  leaderId: integer("leaderId").notNull(),
  memberCount: integer("memberCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Team members association table.
 */
export const teamMembers = pgTable("teamMembers", {
  id: serial("id").primaryKey(),
  teamId: integer("teamId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 120 }).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Deployment records connecting admin-reviewed incidents to assigned teams.
 */
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  teamId: integer("team_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = typeof deployments.$inferInsert;

/**
 * Emergency Contacts table for quick access to fire department and responders.
 */
export const emergencyContacts = pgTable("emergencyContacts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  type: emergencyContactTypeEnum("type").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;

/**
 * Notifications table for push and in-app notifications.
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  type: notificationTypeEnum("type").notNull(),
  relatedIncidentId: integer("relatedIncidentId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Activity log for tracking admin actions and incident updates.
 */
export const activityLog = pgTable("activityLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  relatedIncidentId: integer("relatedIncidentId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * SOS Alerts table to track emergency button activations.
 */
export const sosAlerts = pgTable("sosAlerts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  incidentType: varchar("incident_type", { length: 120 }),
  description: text("description"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  priority: incidentSeverityEnum("priority").default("critical").notNull(),
  emergencyType: sosEmergencyTypeEnum("emergency_type").default("fire").notNull(),
  status: sosAlertStatusEnum("status").default("pending").notNull(),
  assignedTeam: varchar("assigned_team", { length: 255 }),
  eta: varchar("eta", { length: 120 }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type SOSAlert = typeof sosAlerts.$inferSelect;
export type InsertSOSAlert = typeof sosAlerts.$inferInsert;

/**
 * Safe Locations table for evacuation zones and safe places during emergencies.
 */
export const safeLocations = pgTable("safeLocations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 120 }).default("evacuation_zone").notNull(), // evacuation_zone, shelter, hospital, etc.
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  capacity: integer("capacity"), // Number of people it can accommodate
  amenities: text("amenities"), // JSON or comma-separated list
  contactPerson: varchar("contactPerson", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SafeLocation = typeof safeLocations.$inferSelect;
export type InsertSafeLocation = typeof safeLocations.$inferInsert;
