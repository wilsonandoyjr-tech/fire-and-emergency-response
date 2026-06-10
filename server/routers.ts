import { TRPCError, initTRPC } from "@trpc/server";
import { EventEmitter } from "events";
import superjson from "superjson";
import { z } from "zod";
import { clearAuthCookie } from "./authCookies";



type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "fire" | "medical" | "pulis" | "admin" | "user";
};

type Incident = {
  id: number;
  reporterId: number;
  title: string;
  description: string;
  responseRole?: string;
  type: "fire" | "medical" | "pulis";
  latitude: string;
  longitude: string;
  address: string;
  photoUrl?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "submitted" | "verified" | "assigned" | "team_dispatched" | "en_route" | "resolved" | "archived_fake";
  assignedTeamId?: number;
  eta?: string;
  vehicle?: string;
  createdAt: string;
  updatedAt: string;
};

type Team = {
  id: number;
  name: string;
  description: string;
  type: "fire" | "medical" | "pulis";
  contact: string;
  vehicle: string;
  leaderId: number;
  status: "available" | "on_duty" | "active";
  memberCount: number;
};

type TeamMember = {
  id: number;
  teamId: number;
  name: string;
  role: string;
};

type Deployment = {
  id: number;
  incidentId: number;
  teamId: number;
  assignedAt: string;
};

type SosAlert = {
  id: number;
  userId: number;
  userName: string;
  userPhone: string;
  emergencyType: "police" | "ambulance" | "medical" | "fire" | "admin";
  incidentType?: string;
  description?: string;
  latitude: string;
  longitude: string;
  address: string;
  photoUrl?: string;
  notes?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "verified" | "suspicious" | "fake" | "dispatched" | "responding" | "help_arrived" | "resolved";
  assignedTeam?: string;
  eta?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  dispatchedAt?: string;
  respondingAt?: string;
  arrivedAt?: string;
  resolvedAt?: string;
};

type ActivityLogItem = {
  id: number;
  action: string;
  createdAt: string;
};

const t = initTRPC.create({
  transformer: superjson,
});

type Context = {
  user: TrpcUser | null;
  req?: any;
  res?: any;
};

const publicProcedure = t.procedure;


export const incidentEvents = new EventEmitter();

export type TrpcUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: User["role"];
};


const incidents: Incident[] = [
  {
    id: 1,
    reporterId: 2,
    title: "Residential fire near Barangay Hall",
    description: "Visible flames reported by nearby residents.",
    responseRole: "Fire Fighter",
    type: "fire",
    latitude: "14.5995",
    longitude: "120.9842",
    address: "Manila City Hall area",
    photoUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 420'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23050913'/%3E%3Cstop offset='1' stop-color='%237f1d1d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='720' height='420' fill='url(%23g)'/%3E%3Cpath d='M430 320c55-42 66-101 25-157-7 40-25 58-51 74 13-57-22-104-73-137 11 67-58 83-58 155 0 61 50 105 111 105 16 0 31-4 46-12z' fill='%23f97316' opacity='.9'/%3E%3Ccircle cx='540' cy='95' r='72' fill='%23f97316' opacity='.18'/%3E%3Ctext x='40' y='72' fill='%23fff' font-family='Arial' font-size='34' font-weight='700'%3EFire report image%3C/text%3E%3Ctext x='40' y='112' fill='%23fed7aa' font-family='Arial' font-size='20'%3EUser-submitted verification photo%3C/text%3E%3C/svg%3E",
    severity: "medium",
    status: "en_route",
    assignedTeamId: 1,
    eta: "6 minutes",
    vehicle: "Engine 07",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    reporterId: 2,
    title: "Medical assistance request",
    description: "Resident needs emergency medical response after smoke exposure.",
    responseRole: "Rescuer",
    type: "medical",
    latitude: "14.6042",
    longitude: "120.9822",
    address: "Sampaloc, Manila",
    photoUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 420'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23111827'/%3E%3Cstop offset='1' stop-color='%23991b1b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='720' height='420' fill='url(%23g)'/%3E%3Cpath d='M340 340c-84-48-64-128-24-174 19-22 35-46 32-86 62 42 100 94 81 164 22-11 39-32 47-66 49 72 22 157-49 188-30 13-61 7-87-26z' fill='%23fb923c'/%3E%3Cpath d='M383 356c-42-27-30-75-9-102 10-13 19-26 16-49 38 29 61 66 40 111 17-6 28-17 36-35 18 46-4 83-42 94-14 4-28-2-41-19z' fill='%23fde68a'/%3E%3Ctext x='40' y='72' fill='%23fff' font-family='Arial' font-size='34' font-weight='700'%3EFire alert image%3C/text%3E%3Ctext x='40' y='112' fill='%23fed7aa' font-family='Arial' font-size='20'%3EPhoto attached by reporting user%3C/text%3E%3C/svg%3E",
    severity: "high",
    status: "submitted",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

const teams: Team[] = [
  {
    id: 1,
    name: "Fire Brigade Alpha",
    description: "Fire team",
    type: "fire",
    contact: "0917-555-0119",
    vehicle: "Engine 07",
    leaderId: 1,
    status: "on_duty",
    memberCount: 6,
  },
  {
    id: 2,
    name: "Medical Support Unit",
    description: "Medical team",
    type: "medical",
    contact: "0917-555-0120",
    vehicle: "Ambulance 03",
    leaderId: 1,
    status: "available",
    memberCount: 4,
  },
  {
    id: 3,
    name: "Police Response Unit",
    description: "Police team",
    type: "pulis",
    contact: "0917-555-0121",
    vehicle: "Patrol 02",
    leaderId: 1,
    status: "available",
    memberCount: 0,
  },
];

const teamMembers: TeamMember[] = [
  { id: 1, teamId: 1, name: "Capt. Reyes", role: "Team Lead" },
  { id: 2, teamId: 1, name: "Mika Santos", role: "Firefighter" },
  { id: 3, teamId: 1, name: "Jon Delos Cruz", role: "Driver" },
  { id: 4, teamId: 2, name: "Ana Lim", role: "Medic" },
];

const deployments: Deployment[] = [
  {
    id: 1,
    incidentId: 1,
    teamId: 1,
    assignedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
];

const sosAlerts: SosAlert[] = [];
const activityEvents: ActivityLogItem[] = [
  { id: 1, action: "New incident report received", createdAt: new Date().toISOString() },
  { id: 2, action: "Fire Brigade Alpha dispatched", createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 3, action: "Emergency contact list updated", createdAt: new Date(Date.now() - 1200000).toISOString() },
];

const limitInput = z.object({ limit: z.number().int().positive().optional() }).optional();
const ownedLimitInput = z.object({ limit: z.number().int().positive().optional(), ownerId: z.number().int().optional() }).optional();

function addActivity(action: string) {
  activityEvents.unshift({
    id: activityEvents.length + 1,
    action,
    createdAt: new Date().toISOString(),
  });
}

function addIncident(input: {
  ownerId?: number;
  title: string;
  description?: string;
  responseRole?: string;
  type: Incident["type"];
  latitude: string;
  longitude: string;
  address?: string;
  photoUrl?: string;
  severity: Incident["severity"];
}) {
  const { ownerId, ...incidentInput } = input;
  const incident: Incident = {
    id: incidents.length + 1,
    reporterId: ownerId ?? 2,

    description: "",
    address: "",
    ...incidentInput,
    status: "submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  incidents.unshift(incident);
  addActivity(`New ${incident.type} incident report received`);
  incidentEvents.emit("incident:created", incident);
  return incident;
}

function getIncidentTypeFromEmergency(type: SosAlert["emergencyType"]): Incident["type"] | undefined {
  if (type === "fire") return "fire";
  if (type === "ambulance" || type === "medical") return "medical";
  if (type === "police") return "pulis";
  return undefined;
}

function normalizeSosEmergencyType(type: SosAlert["emergencyType"]): SosAlert["emergencyType"] {
  return type === "ambulance" ? "medical" : type;
}

function getRequiredResponderSubtype(type: Incident["type"]) {
  if (type === "fire") return "Fire Fighter";
  if (type === "medical") return "Rescuer";
  return "Police Officer";
}

function getMatchingEmergencyTeam(type: Incident["type"]) {
  return teams.find((team) => team.type === type && team.status === "available");
}

function getFacilityTypesForIncident(type?: Incident["type"]) {
  if (type === "fire") return ["fire_station"];
  if (type === "pulis") return ["police_station"];
  if (type === "medical") return ["hospital"];
  return ["evacuation_zone", "shelter", "hospital", "fire_station", "police_station"];
}

function deployIncidentToTeam(incident: Incident, team: Team) {
  incident.status = "team_dispatched";
  incident.updatedAt = new Date().toISOString();
  incident.assignedTeamId = team.id;
  incident.eta = "Dispatching now";
  incident.vehicle = team.vehicle;
  team.status = "on_duty";

  const deployment: Deployment = {
    id: deployments.length + 1,
    incidentId: incident.id,
    teamId: team.id,
    assignedAt: new Date().toISOString(),
  };

  deployments.unshift(deployment);
  incidentEvents.emit("incident:updated", incident);
  incidentEvents.emit("deployment:created", { deployment, incident, team });
  addActivity(`${team.name} automatically dispatched to SOS ${incident.type} report`);
  return { deployment, incident, team };
}

function normalizeTeamRole(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized.includes("leader") || normalized.includes("lead")) return "Team Leader";
  if (normalized.includes("driver")) return "Driver";
  return "Assistant";
}

function validateTeamMemberSlot(teamId: number, role: string) {
  const normalizedRole = normalizeTeamRole(role);
  const existingMembers = teamMembers.filter((member) => member.teamId === teamId);
  const leaders = existingMembers.filter((member) => normalizeTeamRole(member.role) === "Team Leader").length;
  const drivers = existingMembers.filter((member) => normalizeTeamRole(member.role) === "Driver").length;
  const assistants = existingMembers.filter((member) => normalizeTeamRole(member.role) === "Assistant").length;

  if (existingMembers.length >= 5) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A team can only have 5 members: 1 leader, 1 driver, and 3 assistants.",
    });
  }

  if (normalizedRole === "Team Leader" && leaders >= 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This team already has 1 leader." });
  }

  if (normalizedRole === "Driver" && drivers >= 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This team already has 1 driver." });
  }

  if (normalizedRole === "Assistant" && assistants >= 3) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This team already has 3 assistants." });
  }

  return normalizedRole;
}

export const appRouter = t.router({
  auth: t.router({
    me: publicProcedure.query(({ ctx }) => {
      const user = (ctx as any)?.user;
      if (!user) return null;

      return {
        id: user.id ?? user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        role: user.role,
      };
    }),


    logout: publicProcedure.mutation(({ ctx }) => {
      const requestContext = ctx as Context;
      if (requestContext.req && requestContext.res) {
        clearAuthCookie(requestContext.res, requestContext.req);
      }
      return { ok: true };
    }),

  }),

  user: t.router({
    updateProfile: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        // Stateless demo router: no DB write here yet.
        // For real app: update users table and return updated profile.
        return {
          ok: true,
          profile: input,
        };
      }),
  }),

  incidents: t.router({
    list: publicProcedure.input(limitInput).query(({ input }) => {
      return incidents.slice(0, input?.limit ?? incidents.length);
    }),
    myList: publicProcedure.input(ownedLimitInput).query(({ input }) => {
      // Stateless demo: requires ownerId since we don't persist per-request user in this demo.
      // When you wire real DB, use ctx.user.id.
      const userId = input?.ownerId ?? null;
      if (!userId) return [];


      return incidents
        .filter((incident) => incident.reporterId === userId)
        .slice(0, input?.limit ?? incidents.length);
    }),
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          ownerId: z.number().int().optional(),
          description: z.string().optional().default(""),
          responseRole: z.string().optional(),
          type: z.enum(["fire", "medical", "pulis", "police"]).transform((type) => (type === "police" ? "pulis" : type)),
          latitude: z.string(),
          longitude: z.string(),
          address: z.string().optional().default(""),
          photoUrl: z.string().optional(),
          severity: z.enum(["low", "medium", "high", "critical"]),
        }),
      )
      .mutation(({ input }) => {
        return addIncident(input);
      }),
    updateStatus: publicProcedure
      .input(
        z.object({
          incidentId: z.number().int(),
          status: z.enum(["submitted", "verified", "assigned", "team_dispatched", "en_route", "resolved", "archived_fake"]),
        }),
      )
      .mutation(({ input }) => {
        const incident = incidents.find((item) => item.id === input.incidentId);
        if (!incident) {
          throw new Error("Incident not found");
        }
        incident.status = input.status;
        incident.updatedAt = new Date().toISOString();
        if ((input.status === "resolved" || input.status === "archived_fake") && incident.assignedTeamId) {
          const team = teams.find((item) => item.id === incident.assignedTeamId);
          if (team) team.status = "available";
        }
        incidentEvents.emit("incident:updated", incident);
        return incident;
      }),
    delete: publicProcedure
      .input(z.object({ incidentId: z.number().int(), ownerId: z.number().int().optional() }))
      .mutation(({ input }) => {

        const index = incidents.findIndex((item) => item.id === input.incidentId);
        if (index === -1) {
          throw new Error("Incident not found");
        }

        const incident = incidents[index];
        if (!["resolved", "archived_fake"].includes(incident.status)) {
          throw new Error("Cannot delete active incident");
        }

        const userOwnedRequest = input.ownerId !== undefined;
        if (userOwnedRequest) {
          const userId = input.ownerId;

          if (!userId || incident.reporterId !== userId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own history reports." });
          }
        }

        const [deletedIncident] = incidents.splice(index, 1);
        for (let i = deployments.length - 1; i >= 0; i--) {
          if (deployments[i].incidentId === input.incidentId) {
            deployments.splice(i, 1);
          }
        }
        incidentEvents.emit("incident:deleted", deletedIncident);
        return deletedIncident;
      }),
  }),
  teams: t.router({
    list: publicProcedure.input(limitInput).query(({ input }) => {
      return teams.slice(0, input?.limit ?? teams.length);
    }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional().default(""),
          type: z.enum(["fire", "medical", "pulis"]).default("fire"),
          contact: z.string().optional().default("911"),
          vehicle: z.string().optional().default("Pending vehicle"),
          leaderId: z.number().int(),
        }),
      )
      .mutation(({ input }) => {
        const team: Team = {
          id: teams.length + 1,
          ...input,
          status: "available",
          memberCount: 0,
        };
        teams.unshift(team);
        return team;
      }),
    updateStatus: publicProcedure
      .input(
        z.object({
          teamId: z.number().int(),
          status: z.enum(["available", "on_duty", "active"]),
        }),
      )
      .mutation(({ input }) => {
        const team = teams.find((item) => item.id === input.teamId);
        if (!team) {
          throw new Error("Team not found");
        }
        team.status = input.status;
        return team;
      }),
    update: publicProcedure
      .input(
        z.object({
          teamId: z.number().int(),
          name: z.string().min(1),
          description: z.string().optional().default(""),
          type: z.enum(["fire", "medical", "pulis"]),
          contact: z.string().min(1),
          vehicle: z.string().optional().default("Pending vehicle"),
        }),
      )
      .mutation(({ input }) => {
        const team = teams.find((item) => item.id === input.teamId);
        if (!team) {
          throw new Error("Team not found");
        }

        team.name = input.name;
        team.description = input.description;
        team.type = input.type;
        team.contact = input.contact;
        team.vehicle = input.vehicle;
        return team;
      }),
    delete: publicProcedure
      .input(z.object({ teamId: z.number().int() }))
      .mutation(({ input }) => {
        const index = teams.findIndex((item) => item.id === input.teamId);
        if (index === -1) {
          throw new Error("Team not found");
        }

        const [deletedTeam] = teams.splice(index, 1);
        for (let i = teamMembers.length - 1; i >= 0; i--) {
          if (teamMembers[i].teamId === input.teamId) {
            teamMembers.splice(i, 1);
          }
        }
        deployments.forEach((deployment) => {
          if (deployment.teamId === input.teamId) {
            const incident = incidents.find((item) => item.id === deployment.incidentId);
            if (incident) {
              incident.assignedTeamId = undefined;
              incident.vehicle = undefined;
            }
          }
        });
        return deletedTeam;
      }),
    members: publicProcedure
      .input(z.object({ teamId: z.number().int() }))
      .query(({ input }) => teamMembers.filter((member) => member.teamId === input.teamId)),
    addMember: publicProcedure
      .input(
        z.object({
          teamId: z.number().int(),
          name: z.string().min(1),
          role: z.string().min(1),
        }),
      )
      .mutation(({ input }) => {
        const role = validateTeamMemberSlot(input.teamId, input.role);
        const member: TeamMember = {
          id: teamMembers.length + 1,
          teamId: input.teamId,
          name: input.name,
          role,
        };
        teamMembers.push(member);
        const team = teams.find((item) => item.id === input.teamId);
        if (team) team.memberCount = teamMembers.filter((item) => item.teamId === input.teamId).length;
        return member;
      }),
    deleteMember: publicProcedure
      .input(z.object({ memberId: z.number().int() }))
      .mutation(({ input }) => {
        const index = teamMembers.findIndex((member) => member.id === input.memberId);
        if (index === -1) {
          throw new Error("Team member not found");
        }
        const [removed] = teamMembers.splice(index, 1);
        const team = teams.find((item) => item.id === removed.teamId);
        if (team) team.memberCount = teamMembers.filter((item) => item.teamId === removed.teamId).length;
        return removed;
      }),
  }),
  deployments: t.router({
    list: publicProcedure.query(() => deployments),
    assignTeam: publicProcedure
      .input(z.object({ incidentId: z.number().int(), teamId: z.number().int() }))
      .mutation(({ input }) => {
        const incident = incidents.find((item) => item.id === input.incidentId);
        const team = teams.find((item) => item.id === input.teamId);
        if (!incident || !team) {
          throw new Error("Incident or team not found");
        }
        if (incident.type !== team.type) {
          throw new Error(`Only ${incident.type} response teams can be assigned to this ${incident.type} incident.`);
        }
        if (team.status !== "available") {
          throw new Error("Only available teams can be deployed.");
        }
        if (incident.status !== "verified") {
          throw new Error("Incident must be verified before assignment.");
        }
        incident.status = "assigned";
        incident.updatedAt = new Date().toISOString();
        incident.assignedTeamId = team.id;
        incident.eta = "8 minutes";
        incident.vehicle = team.vehicle;
        team.status = "on_duty";
        const deployment: Deployment = {
          id: deployments.length + 1,
          ...input,
          assignedAt: new Date().toISOString(),
        };
        deployments.unshift(deployment);
        incidentEvents.emit("incident:updated", incident);
        incidentEvents.emit("deployment:created", { deployment, incident, team });
        return { deployment, incident, team };
      }),
  }),
  sosAlerts: t.router({
    getActive: publicProcedure.query(() => sosAlerts.filter((alert) => !["resolved", "fake"].includes(alert.status))),
    myActive: publicProcedure.input(ownedLimitInput).query(({ input }) => {
      // Demo router: requires ownerId since demo is stateless per request.
      const userId = input?.ownerId ?? null;
      if (!userId) return [];


      return sosAlerts
        .filter((alert) => alert.userId === userId && !["resolved", "fake"].includes(alert.status))
        .slice(0, input?.limit ?? sosAlerts.length);
    }),
    list: publicProcedure.input(limitInput).query(({ input }) => {
      return sosAlerts.slice(0, input?.limit ?? sosAlerts.length);
    }),
    create: publicProcedure
      .input(
        z.object({
          emergencyType: z.enum(["police", "ambulance", "medical", "fire", "admin"]),
          ownerId: z.number().int().optional(),
          incidentType: z.string().optional(),
          description: z.string().optional(),
          latitude: z.string(),
          longitude: z.string(),
          address: z.string().optional().default("Valencia City, Bukidnon"),
          photoUrl: z.string().optional(),
          notes: z.string().optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional().default("critical"),
          assignedTeam: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const emergencyType = normalizeSosEmergencyType(input.emergencyType);
        const userId = input.ownerId ?? 2;
        const alert: SosAlert = {
          id: Date.now(),
          userId,
          userName: "Jun",
          userPhone: "Not provided",

          ...input,
          emergencyType,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        sosAlerts.unshift(alert);
        addActivity(`SOS data packet sent: ${alert.incidentType ?? alert.emergencyType} at ${alert.address}`);
        incidentEvents.emit("sos:created", alert);

        const incidentType = getIncidentTypeFromEmergency(alert.emergencyType);
        if (incidentType) {
          const requiredSubtype = getRequiredResponderSubtype(incidentType);
          const reportReason =
            alert.incidentType && !["fire", "ambulance", "medical", "police", "admin"].includes(alert.incidentType)
              ? alert.incidentType
              : alert.description ?? `${requiredSubtype} SOS`;
          const incident = addIncident({
            title: `SOS ${reportReason} report at ${alert.address}`,
            ownerId: userId,
            description: reportReason,
            responseRole: requiredSubtype,
            type: incidentType,
            latitude: alert.latitude,
            longitude: alert.longitude,
            address: alert.address,
            photoUrl: alert.photoUrl,
            severity: alert.priority,
          });

          addActivity(`SOS ${incidentType} incident routed to ${incidentType} dashboard for ${requiredSubtype} verification`);
        }

        return alert;
      }),
    updateStatus: publicProcedure
      .input(
        z.object({
          alertId: z.number().int(),
          status: z.enum(["pending", "verified", "suspicious", "fake", "dispatched", "responding", "help_arrived", "resolved"]),
          assignedTeam: z.string().optional(),
          eta: z.string().optional(),
          resolutionNotes: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const alert = sosAlerts.find((item) => item.id === input.alertId);
        if (!alert) {
          throw new Error("SOS alert not found");
        }
        const now = new Date().toISOString();
        alert.status = input.status;
        alert.assignedTeam = input.assignedTeam ?? alert.assignedTeam;
        alert.eta = input.eta ?? alert.eta;
        alert.resolutionNotes = input.resolutionNotes ?? alert.resolutionNotes;
        alert.updatedAt = now;
        if (input.status === "verified") alert.verifiedAt = now;
        if (input.status === "dispatched") alert.dispatchedAt = now;
        if (input.status === "responding") alert.respondingAt = now;
        if (input.status === "help_arrived") alert.arrivedAt = now;
        if (input.status === "resolved") {
          alert.resolvedAt = now;
        }
        addActivity(`SOS #${alert.id} moved to ${input.status.replace("_", " ")}`);
        incidentEvents.emit("sos:updated", alert);
        return alert;
      }),
    notifyNearbyUnit: publicProcedure
      .input(
        z.object({
          alertId: z.number().int(),
          assignedTeam: z.string().optional(),
          note: z.string().optional(),
        }),
      )
      .mutation(({ input }) => {
        const alert = sosAlerts.find((item) => item.id === input.alertId);
        if (!alert) {
          throw new Error("SOS alert not found");
        }

        alert.assignedTeam = input.assignedTeam ?? alert.assignedTeam ?? "Nearest emergency unit";
        alert.updatedAt = new Date().toISOString();
        addActivity(input.note ?? `Nearby unit notified for SOS #${alert.id}`);
        incidentEvents.emit("sos:updated", alert);
        return alert;
      }),
  }),
  activityLog: t.router({
    list: publicProcedure.input(limitInput).query(({ input }) => {
      return activityEvents.slice(0, input?.limit ?? activityEvents.length);
    }),
  }),
  emergencyContacts: t.router({
    list: publicProcedure.query(() => [
      {
        id: 1,
        type: "fire_department",
        name: "Fire Responder",
        description: "Fire response team and incident support",
        phone: "911",
        email: "bfp@example.com",
      },
      {
        id: 2,
        type: "police",
        name: "Police Responder",
        description: "Police support and public safety response",
        phone: "911",
        email: "police@example.com",
      },
      {
        id: 3,
        type: "ambulance",
        name: "Medical Responder",
        description: "Medical emergency and ambulance dispatch",
        phone: "911",
        email: "ems@example.com",
      },
    ]),
  }),
  safeLocations: t.router({
    list: publicProcedure.input(limitInput).query(({ input }) => {
      const safeLocations = [
        {
          id: 101,
          name: "Valencia Central Fire Station",
          description: "Nearest fire station for fire reports",
          type: "fire_station",
          latitude: "7.9031",
          longitude: "125.0908",
          address: "Valencia City Fire Station, Bukidnon",
          capacity: 0,
          amenities: "Fire response, rescue equipment, emergency dispatch",
          contactPerson: "Fire Desk",
          contactPhone: "0917-555-0119",
        },
        {
          id: 102,
          name: "Valencia Emergency Hospital",
          description: "Nearest hospital for medical reports",
          type: "hospital",
          latitude: "7.9083",
          longitude: "125.0945",
          address: "Valencia City Emergency Hospital, Bukidnon",
          capacity: 500,
          amenities: "Emergency room, ambulance bay, trauma care",
          contactPerson: "Hospital ER",
          contactPhone: "0917-555-0120",
        },
        {
          id: 103,
          name: "Valencia Police Station",
          description: "Nearest police station for police reports",
          type: "police_station",
          latitude: "7.9062",
          longitude: "125.0902",
          address: "Valencia City Police Station, Bukidnon",
          capacity: 0,
          amenities: "Police response, public safety desk, incident intake",
          contactPerson: "Police Desk",
          contactPhone: "0917-555-0121",
        },
        {
          id: 1,
          name: "Valencia City Sports Complex",
          description: "Main evacuation center with medical facilities",
          type: "evacuation_zone",
          latitude: "8.2275",
          longitude: "125.1542",
          address: "Valencia City, Bukidnon",
          capacity: 5000,
          amenities: "Medical clinic, water, food, restrooms",
          contactPerson: "Mr. Garcia",
          contactPhone: "0917-123-4567",
        },
        {
          id: 2,
          name: "City Hospital Emergency Relief",
          description: "Medical facility for injured persons",
          type: "hospital",
          latitude: "8.2305",
          longitude: "125.1555",
          address: "Hospital Road, Valencia City",
          capacity: 500,
          amenities: "Emergency room, medical staff, ambulance parking",
          contactPerson: "Dr. Santos",
          contactPhone: "0917-234-5678",
        },
        {
          id: 3,
          name: "Barangay Community Center",
          description: "Secondary evacuation shelter",
          type: "shelter",
          latitude: "8.2245",
          longitude: "125.1525",
          address: "Barangay Hall, Valencia City",
          capacity: 2000,
          amenities: "Toilets, water stations, first aid kit",
          contactPerson: "Brgy. Captain",
          contactPhone: "0917-345-6789",
        },
        {
          id: 4,
          name: "Elementary School Grounds",
          description: "Safe area for families and children",
          type: "evacuation_zone",
          latitude: "8.2350",
          longitude: "125.1480",
          address: "School Road, Valencia City",
          capacity: 3000,
          amenities: "Open ground, shelter, water",
          contactPerson: "Principal Torres",
          contactPhone: "0917-456-7890",
        },
        {
          id: 5,
          name: "Public Park Safe Zone",
          description: "Open area for temporary evacuation",
          type: "evacuation_zone",
          latitude: "8.2200",
          longitude: "125.1600",
          address: "Park Avenue, Valencia City",
          capacity: 4000,
          amenities: "Open space, basic facilities",
          contactPerson: "Park Manager",
          contactPhone: "0917-567-8901",
        },
      ];
      return safeLocations.slice(0, input?.limit ?? safeLocations.length);
    }),
    getNearby: publicProcedure
      .input(
        z.object({
          latitude: z.string(),
          longitude: z.string(),
          incidentType: z.enum(["fire", "medical", "pulis"]).optional(),
          radiusKm: z.number().optional().default(5),
        }),
      )
      .query(({ input }) => {
        const allSafeLocations = [
          {
            id: 101,
            name: "Valencia Central Fire Station",
            description: "Nearest fire station for fire reports",
            type: "fire_station",
            latitude: "7.9031",
            longitude: "125.0908",
            address: "Valencia City Fire Station, Bukidnon",
            capacity: 0,
            amenities: "Fire response, rescue equipment, emergency dispatch",
            contactPerson: "Fire Desk",
            contactPhone: "0917-555-0119",
          },
          {
            id: 102,
            name: "Valencia Emergency Hospital",
            description: "Nearest hospital for medical reports",
            type: "hospital",
            latitude: "7.9083",
            longitude: "125.0945",
            address: "Valencia City Emergency Hospital, Bukidnon",
            capacity: 500,
            amenities: "Emergency room, ambulance bay, trauma care",
            contactPerson: "Hospital ER",
            contactPhone: "0917-555-0120",
          },
          {
            id: 103,
            name: "Valencia Police Station",
            description: "Nearest police station for police reports",
            type: "police_station",
            latitude: "7.9062",
            longitude: "125.0902",
            address: "Valencia City Police Station, Bukidnon",
            capacity: 0,
            amenities: "Police response, public safety desk, incident intake",
            contactPerson: "Police Desk",
            contactPhone: "0917-555-0121",
          },
          {
            id: 1,
            name: "Valencia City Sports Complex",
            description: "Main evacuation center with medical facilities",
            type: "evacuation_zone",
            latitude: "8.2275",
            longitude: "125.1542",
            address: "Valencia City, Bukidnon",
            capacity: 5000,
            amenities: "Medical clinic, water, food, restrooms",
            contactPerson: "Mr. Garcia",
            contactPhone: "0917-123-4567",
          },
          {
            id: 2,
            name: "City Hospital Emergency Relief",
            description: "Medical facility for injured persons",
            type: "hospital",
            latitude: "8.2305",
            longitude: "125.1555",
            address: "Hospital Road, Valencia City",
            capacity: 500,
            amenities: "Emergency room, medical staff, ambulance parking",
            contactPerson: "Dr. Santos",
            contactPhone: "0917-234-5678",
          },
          {
            id: 3,
            name: "Barangay Community Center",
            description: "Secondary evacuation shelter",
            type: "shelter",
            latitude: "8.2245",
            longitude: "125.1525",
            address: "Barangay Hall, Valencia City",
            capacity: 2000,
            amenities: "Toilets, water stations, first aid kit",
            contactPerson: "Brgy. Captain",
            contactPhone: "0917-345-6789",
          },
          {
            id: 4,
            name: "Elementary School Grounds",
            description: "Safe area for families and children",
            type: "evacuation_zone",
            latitude: "8.2350",
            longitude: "125.1480",
            address: "School Road, Valencia City",
            capacity: 3000,
            amenities: "Open ground, shelter, water",
            contactPerson: "Principal Torres",
            contactPhone: "0917-456-7890",
          },
          {
            id: 5,
            name: "Public Park Safe Zone",
            description: "Open area for temporary evacuation",
            type: "evacuation_zone",
            latitude: "8.2200",
            longitude: "125.1600",
            address: "Park Avenue, Valencia City",
            capacity: 4000,
            amenities: "Open space, basic facilities",
            contactPerson: "Park Manager",
            contactPhone: "0917-567-8901",
          },
        ];

        const incidentLat = parseFloat(input.latitude);
        const incidentLng = parseFloat(input.longitude);
        const facilityTypes = getFacilityTypesForIncident(input.incidentType);

        // Simple distance calculation (Haversine formula approximation)
        function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
          const R = 6371; // Earth's radius in km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }

        return allSafeLocations
          .filter((location) => facilityTypes.includes(location.type))
          .map((location) => ({
            ...location,
            distance: calculateDistance(
              incidentLat,
              incidentLng,
              parseFloat(location.latitude),
              parseFloat(location.longitude),
            ),
          }))
          .filter((location) => location.distance <= input.radiusKm)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5); // Return top 5 nearest safe locations
      }),
  }),
  notifications: t.router({
    list: publicProcedure.input(limitInput).query(({ input }) => {
      const notifications = [
        {
          id: 1,
          title: "Nearby fire alert",
          message: "A response team is checking an incident in your area.",
          createdAt: new Date().toISOString(),
        },
      ];
      return notifications.slice(0, input?.limit ?? notifications.length);
    }),
  }),
});

export type AppRouter = typeof appRouter;
