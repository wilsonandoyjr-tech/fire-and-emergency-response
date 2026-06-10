# Fire Alert System

Real-time fire alert and emergency response application for incident reporting, responder coordination, and emergency contact access.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/Radix UI components |
| Backend | Node.js, Express, tRPC, TypeScript |
| Database | PostgreSQL hosted on Neon |
| ORM / migrations | Drizzle ORM, Drizzle Kit |
| Auth/session | OAuth callback flow, signed session cookies |
| Package manager | pnpm via Corepack |

## Database Structure

The PostgreSQL schema is defined in `drizzle/schema.ts` and the initial SQL migration is in `drizzle/0000_initial_postgres.sql`.

### `users`

Stores authenticated users and role-based access data.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `openId` | varchar(64) | Unique OAuth/user identity |
| `name` | text | Optional display name |
| `email` | varchar(320) | Optional email |
| `phone` | varchar(20) | Optional phone number |
| `loginMethod` | varchar(64) | OAuth/login provider |
| `role` | enum `user_role` | `user` or `admin`, defaults to `user` |
| `profileImage` | text | Optional storage URL |
| `createdAt` | timestamp | Defaults to current time |
| `updatedAt` | timestamp | Defaults to current time |
| `lastSignedIn` | timestamp | Defaults to current time |

### `incidents`

Stores fire, smoke, and false-alarm reports with location and response status.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `reporterId` | integer | User who reported the incident |
| `title` | varchar(255) | Required |
| `description` | text | Optional details |
| `type` | enum `incident_type` | `fire`, `smoke`, `false_alarm` |
| `status` | enum `incident_status` | `reported`, `responding`, `contained`, `resolved` |
| `latitude` | numeric(10,8) | Required |
| `longitude` | numeric(11,8) | Required |
| `address` | text | Optional address |
| `photoUrl` | text | Optional storage URL |
| `severity` | enum `incident_severity` | `low`, `medium`, `high`, `critical` |
| `assignedTeamId` | integer | Optional team assignment |
| `createdAt` | timestamp | Defaults to current time |
| `updatedAt` | timestamp | Defaults to current time |

### `teams`

Stores responder teams managed by admins.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `name` | varchar(255) | Required |
| `description` | text | Optional |
| `status` | enum `team_status` | `active`, `inactive`, `on_duty` |
| `leaderId` | integer | Team leader user id |
| `memberCount` | integer | Defaults to `0` |
| `createdAt` | timestamp | Defaults to current time |
| `updatedAt` | timestamp | Defaults to current time |

### `teamMembers`

Links users to responder teams.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `teamId` | integer | Team id |
| `userId` | integer | User id |
| `role` | enum `team_member_role` | `leader` or `member` |
| `joinedAt` | timestamp | Defaults to current time |

### `emergencyContacts`

Stores active emergency contact records.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `name` | varchar(255) | Required |
| `phone` | varchar(20) | Required |
| `email` | varchar(320) | Optional |
| `type` | enum `emergency_contact_type` | `fire_department`, `police`, `ambulance`, `responder` |
| `description` | text | Optional |
| `isActive` | boolean | Defaults to `true` |
| `createdAt` | timestamp | Defaults to current time |
| `updatedAt` | timestamp | Defaults to current time |

### `notifications`

Stores in-app notifications for users.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `userId` | integer | Recipient user id |
| `title` | varchar(255) | Required |
| `message` | text | Optional |
| `type` | enum `notification_type` | `incident`, `sos`, `status_update`, `team_assignment` |
| `relatedIncidentId` | integer | Optional incident reference |
| `isRead` | boolean | Defaults to `false` |
| `createdAt` | timestamp | Defaults to current time |

### `activityLog`

Tracks admin actions and incident updates.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `userId` | integer | Acting user id |
| `action` | varchar(255) | Required action label |
| `relatedIncidentId` | integer | Optional incident reference |
| `details` | text | Optional details |
| `createdAt` | timestamp | Defaults to current time |

### `sosAlerts`

Stores emergency SOS activations.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `userId` | integer | User who activated SOS |
| `latitude` | numeric(10,8) | Required |
| `longitude` | numeric(11,8) | Required |
| `status` | enum `sos_alert_status` | `active`, `responded`, `cancelled` |
| `createdAt` | timestamp | Defaults to current time |
| `respondedAt` | timestamp | Optional response timestamp |

## Local Database Setup

Set `DATABASE_URL` to your Neon PostgreSQL connection string before running database commands.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

Then run:

```bash
corepack pnpm db:push
```
