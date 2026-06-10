import { useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapView } from "@/components/Map";
import { getSocketUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { AdminShell } from "@/components/AdminBottomNav";
import { UserMobileShell } from "@/components/UserBottomNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { getReportOwnerId } from "@/lib/reportOwner";
import {
  Ambulance,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  Flame,
  History,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Route,
  Shield,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

type SafeLocationGuide = {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  type: string;
  address: string;
  description: string;
  distance?: number;
  capacity?: number;
  amenities?: string;
  contactPhone?: string;
};

const statusStyles = {
  submitted: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  verified: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
  assigned: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  team_dispatched: "border-orange-400/30 bg-orange-500/10 text-orange-300",
  en_route: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  resolved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  archived_fake: "border-slate-400/30 bg-slate-500/10 text-slate-300",
};

const statusLabels = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  team_dispatched: "Team Dispatched",
  en_route: "En Route",
  resolved: "Resolved",
  archived_fake: "Archived / Fake",
};

const responseFlow = ["submitted", "verified", "assigned", "team_dispatched", "en_route", "resolved"] as const;

const incidentTypeInfo = {
  fire: { label: "Fire", roles: "Investigator, Fire Fighter", team: "Fire response team" },
  medical: { label: "Medical", roles: "Rescuer", team: "Medical response team" },
  pulis: { label: "Police", roles: "Police Officer, Investigator", team: "Police response team" },
};

const responderShellInfo = {
  fire: {
    title: "Fire Dashboard",
    eyebrow: "Fire Alert Management",
    response: "Fire Response",
    officer: "Fire Officer",
    accent: "orange",
    icon: Flame,
  },
  medical: {
    title: "Medical Dashboard",
    eyebrow: "Medical Alert Management",
    response: "Medical Response",
    officer: "Medical Officer",
    accent: "emerald",
    icon: Ambulance,
  },
  pulis: {
    title: "Police Dashboard",
    eyebrow: "Police Alert Management",
    response: "Police Response",
    officer: "Police Officer",
    accent: "blue",
    icon: Shield,
  },
} as const;

const nextStatus = {
  assigned: "team_dispatched",
  team_dispatched: "en_route",
  en_route: "resolved",
} as const;

function calculateDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance?: number) {
  if (typeof distance !== "number" || !Number.isFinite(distance)) return "Distance unavailable";
  if (distance < 1) return `${Math.round(distance * 1000)} m away`;
  return `${distance.toFixed(1)} km away`;
}

function IncidentMap({
  lat,
  lng,
  title,
  safeLocations = [],
}: {
  lat: number;
  lng: number;
  title: string;
  safeLocations?: SafeLocationGuide[];
}) {
  const points = [
    {
      id: "incident",
      lat,
      lng,
      title,
      color: "#f97316",
      label: "!",
    },
    ...safeLocations
      .map((location) => ({
        id: `safe-${location.id}`,
        lat: Number(location.latitude),
        lng: Number(location.longitude),
        title: `${location.name} - ${formatDistance(location.distance)}`,
        color: "#16a34a",
        label: "S",
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
  ];

  return (
    <MapView
      key={`${lat}-${lng}-${safeLocations.map((location) => location.id).join("-")}`}
      className="h-72 rounded-2xl border border-orange-500/25"
      initialCenter={{ lat, lng }}
      initialZoom={safeLocations.length > 0 ? 14 : 16}
      points={points}
    />
  );
}

function ResponderReviewShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: keyof typeof responderShellInfo;
}) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const info = responderShellInfo[role];
  const RoleIcon = info.icon;
  const dashboardPath = `/${role}/dashboard`;
  const accent = {
    orange: {
      border: "border-orange-500/15",
      iconBg: "bg-orange-500/20",
      iconText: "text-orange-300",
      activeBg: "bg-orange-500/15",
      activeMobileBg: "bg-orange-500/20",
      button: "bg-orange-600 hover:bg-orange-700",
    },
    emerald: {
      border: "border-emerald-500/15",
      iconBg: "bg-emerald-500/20",
      iconText: "text-emerald-300",
      activeBg: "bg-emerald-500/15",
      activeMobileBg: "bg-emerald-500/20",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
    blue: {
      border: "border-blue-500/15",
      iconBg: "bg-blue-500/20",
      iconText: "text-blue-300",
      activeBg: "bg-blue-500/15",
      activeMobileBg: "bg-blue-500/20",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  }[info.accent];
  const navItems = [
    { id: "reports", label: "Reports", icon: RoleIcon },
    { id: "teams", label: "Team Management", icon: Users },
    { id: "history", label: "History", icon: History },
    { id: "deploy", label: "Deploy", icon: Radio },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/welcome");
  };

  return (
    <div className="min-h-screen bg-[#050913] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className={`hidden w-72 flex-col border-r ${accent.border} bg-slate-950 p-4 lg:flex`}>
          <div className="mb-8 flex items-center gap-3">
            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${accent.iconBg} ${accent.iconText}`}>
              <RoleIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{info.response}</p>
              <h1 className="text-xl font-bold">{info.title}</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === "reports";
              return (
                <button
                  key={item.id}
                  onClick={() => setLocation(dashboardPath)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active ? `${accent.activeBg} ${accent.iconText}` : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-slate-900 p-4">
            <p className="font-semibold">{user?.name || info.officer}</p>
            <p className="text-sm capitalize text-slate-400">{user?.role || role} role</p>
            <Button onClick={handleLogout} className="mt-4 w-full bg-slate-800 text-white hover:bg-slate-700">
              Sign Out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${accent.iconText}`}>{info.eyebrow}</p>
                <h2 className="text-2xl font-bold">{info.title}</h2>
              </div>
              <Button onClick={() => setLocation(dashboardPath)} className={`${accent.button} text-white`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-4 gap-2 border-b border-white/10 bg-slate-950/80 p-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === "reports";
              return (
                <button
                  key={item.id}
                  onClick={() => setLocation(dashboardPath)}
                  className={`rounded-2xl px-2 py-3 text-[11px] font-semibold ${
                    active ? `${accent.activeMobileBg} ${accent.iconText}` : "text-slate-500"
                  }`}
                >
                  <Icon className="mx-auto mb-1 h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-5 p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function IncidentDetails() {
  const [, setLocation] = useLocation();
  const reportOwnerId = getReportOwnerId();
  const [adminMatch, adminParams] = useRoute("/admin/incidents/:id");
  const [fireReviewMatch, fireReviewParams] = useRoute("/fire/incidents/:id/review");
  const [medicalReviewMatch, medicalReviewParams] = useRoute("/medical/incidents/:id/review");
  const [pulisReviewMatch, pulisReviewParams] = useRoute("/pulis/incidents/:id/review");
  const [fireMatch, fireParams] = useRoute("/fire/incidents/:id");
  const [medicalMatch, medicalParams] = useRoute("/medical/incidents/:id");
  const [pulisMatch, pulisParams] = useRoute("/pulis/incidents/:id");
  const [userMatch, userParams] = useRoute("/user/incidents/:id");
  const isAdmin = adminMatch;
  const isFire = fireMatch || fireReviewMatch;
  const isMedical = medicalMatch || medicalReviewMatch;
  const isPulis = pulisMatch || pulisReviewMatch;
  const responderRouteRole = isFire ? "fire" : isMedical ? "medical" : isPulis ? "pulis" : null;
  const isReviewOnly = Boolean(isAdmin || fireReviewMatch || medicalReviewMatch || pulisReviewMatch);
  const routeIncidentType = !isReviewOnly && fireMatch ? "fire" : !isReviewOnly && medicalMatch ? "medical" : !isReviewOnly && pulisMatch ? "pulis" : null;
  const canOpenResponseTools = Boolean(routeIncidentType);
  const incidentId = Number(
    adminParams?.id ??
      fireReviewParams?.id ??
      medicalReviewParams?.id ??
      pulisReviewParams?.id ??
      fireParams?.id ??
      medicalParams?.id ??
      pulisParams?.id ??
      userParams?.id,
  );
  const backPath = isFire ? "/fire/dashboard" : isMedical ? "/medical/dashboard" : isPulis ? "/pulis/dashboard" : isAdmin ? "/admin/reports" : "/user/incidents";
  const { data: allIncidents, isLoading: isAllIncidentsLoading } = trpc.incidents.list.useQuery({ limit: 100 });
  const { data: userIncidents, isLoading: isUserIncidentsLoading } = trpc.incidents.myList.useQuery(
    { limit: 100, ownerId: reportOwnerId },
    { enabled: userMatch },
  );
  const incidents = userMatch ? (userIncidents && userIncidents.length > 0 ? userIncidents : allIncidents) : allIncidents;
  const isLoading = userMatch ? isUserIncidentsLoading || ((userIncidents?.length ?? 0) === 0 && isAllIncidentsLoading) : isAllIncidentsLoading;
  const { data: teams } = trpc.teams.list.useQuery({ limit: 50 });
  const { data: sosAlerts } = trpc.sosAlerts.getActive.useQuery(undefined, { enabled: canOpenResponseTools });
  const utils = trpc.useUtils();
  const updateStatus = trpc.incidents.updateStatus.useMutation({
    onSuccess: () => Promise.all([utils.incidents.list.invalidate(), utils.incidents.myList.invalidate()]),
    onError: (error) => toast.error(error.message || "Failed to update incident"),
  });
  const assignTeam = trpc.deployments.assignTeam.useMutation({
    onSuccess: async ({ team }) => {
      toast.success(`${team.name} assigned to this incident`);
      await Promise.all([utils.incidents.list.invalidate(), utils.teams.list.invalidate(), utils.deployments.list.invalidate()]);
    },
    onError: (error) => toast.error(error.message || "Failed to assign response team"),
  });

  const incident = useMemo(
    () => incidents?.find((item) => item.id === incidentId),
    [incidentId, incidents],
  );

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const refreshIncident = () => {
      if (userMatch) {
        void utils.incidents.myList.invalidate();
      } else {
        void utils.incidents.list.invalidate();
      }
    };

    socket.on("incident:updated", refreshIncident);
    socket.on("incident:deleted", refreshIncident);

    return () => {
      socket.off("incident:updated", refreshIncident);
      socket.off("incident:deleted", refreshIncident);
      socket.disconnect();
    };
  }, [userMatch, utils]);

  useEffect(() => {
    if (isLoading || !incident || !responderRouteRole || isAdmin) return;
    if (incident.type !== responderRouteRole) {
      setLocation(`/${responderRouteRole}/dashboard`, { replace: true });
    }
  }, [incident, isAdmin, isLoading, responderRouteRole, setLocation]);

  const lat = Number(incident?.latitude);
  const lng = Number(incident?.longitude);
  const hasValidLocation = Number.isFinite(lat) && Number.isFinite(lng);

  const { data: nearestSafeLocations } = trpc.safeLocations.getNearby.useQuery(
    {
      latitude: lat.toString(),
      longitude: lng.toString(),
      incidentType: incident?.type,
      radiusKm: 10,
    },
    { enabled: hasValidLocation && Boolean(incident) },
  );
  const { data: safeLocationList } = trpc.safeLocations.list.useQuery({ limit: 20 }, { enabled: hasValidLocation });
  const assignedTeam = teams?.find((team) => team.id === incident?.assignedTeamId);
  const typeInfo = incident
    ? incidentTypeInfo[incident.type as keyof typeof incidentTypeInfo] ?? incidentTypeInfo.fire
    : incidentTypeInfo.fire;
  const canManageIncident = Boolean(routeIncidentType && incident?.type === routeIncidentType);
  const matchingTeams = useMemo(() => {
    if (!incident) return [];
    return (teams ?? [])
      .filter((team) => team.type === incident.type && team.status === "available")
      .sort((a, b) => {
        const aReady = a.status === "available" ? 0 : a.status === "on_duty" ? 1 : 2;
        const bReady = b.status === "available" ? 0 : b.status === "on_duty" ? 1 : 2;
        return aReady - bReady || a.name.localeCompare(b.name);
      });
  }, [incident, teams]);
  const assignableTeams = matchingTeams;
  const activeSosAlerts = (sosAlerts ?? []).filter((alert) => {
    if (!incident) return false;
    if (incident.type === "fire") return alert.emergencyType === "fire";
    if (incident.type === "medical") return alert.emergencyType === "ambulance" || alert.emergencyType === "medical";
    if (incident.type === "pulis") return alert.emergencyType === "police";
    return false;
  });
  const managementTitle = `${typeInfo.label} Incident Management`;

  const safeLocations = useMemo<SafeLocationGuide[]>(() => {
    const nearby = (nearestSafeLocations ?? []) as SafeLocationGuide[];
    const source = nearby.length > 0 ? nearby : ((safeLocationList ?? []) as SafeLocationGuide[]);

    return source
      .map((location) => {
        const safeLat = Number(location.latitude);
        const safeLng = Number(location.longitude);
        return {
          ...location,
          distance:
            typeof location.distance === "number"
              ? location.distance
              : Number.isFinite(safeLat) && Number.isFinite(safeLng) && hasValidLocation
                ? calculateDistanceKm(lat, lng, safeLat, safeLng)
                : undefined,
        };
      })
      .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY));
  }, [hasValidLocation, lat, lng, nearestSafeLocations, safeLocationList]);

  const nearestSafeLocation = safeLocations[0];
  const guideTargetLabel =
    incident?.type === "fire"
      ? "nearest fire station"
      : incident?.type === "medical"
        ? "nearest hospital"
        : incident?.type === "pulis"
          ? "nearest police station"
          : "nearest emergency facility";
  const directionsUrl =
    hasValidLocation && nearestSafeLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${nearestSafeLocation.latitude},${nearestSafeLocation.longitude}&travelmode=driving`
      : null;

  const responderReviewRole = fireReviewMatch ? "fire" : medicalReviewMatch ? "medical" : pulisReviewMatch ? "pulis" : null;
  const canReviewSubmittedReport = Boolean(responderReviewRole && incident?.type === responderReviewRole && incident.status === "submitted");
  const Shell = isAdmin ? AdminShell : UserMobileShell;

  const handleResponderReviewStatus = async (status: "verified" | "archived_fake") => {
    if (!incident) return;
    await updateStatus.mutateAsync({ incidentId: incident.id, status });

    if (status === "verified" && responderReviewRole) {
      const availableTeam = matchingTeams[0];
      if (availableTeam) {
        await assignTeam.mutateAsync({ incidentId: incident.id, teamId: availableTeam.id });
        return;
      }
    }

    toast.success(status === "verified" ? "Report verified and moved to Deploy" : "Report marked fake and moved to History");
  };

  return responderReviewRole ? (
      <ResponderReviewShell role={responderReviewRole}>
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <button onClick={() => setLocation(backPath)} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold">Incident Details</h1>
            <MapPin className="h-5 w-5 text-orange-400" />
          </div>
        </div>

        <main className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
            </div>
          ) : !incident ? (
            <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-6 text-center text-slate-400">
              Incident not found
            </Card>
          ) : (
            <>
              <Card className="rounded-[2rem] border-orange-500/25 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.22),transparent_36%),linear-gradient(135deg,#0b1220,#050913)] p-5 shadow-xl shadow-orange-950/30">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-orange-500/15 p-3">
                    <Flame className="h-6 w-6 text-orange-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                          {typeInfo.label}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-white">{incident.title}</h2>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[incident.status]}`}>
                        {statusLabels[incident.status]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{incident.description || "No description provided."}</p>
                    <p className="mt-2 text-sm text-orange-200">Report roles: {typeInfo.roles}</p>
                    <p className="mt-3 text-sm text-slate-400">{incident.address || "GPS location captured"}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Incident Location</h3>
                    <p className="text-sm text-slate-400">
                      {hasValidLocation ? `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}` : "No GPS coordinates available"}
                    </p>
                  </div>
                  <MapPin className="h-5 w-5 text-orange-300" />
                </div>
                {hasValidLocation ? (
                  <IncidentMap lat={lat} lng={lng} title={incident.title} safeLocations={safeLocations} />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
                    Location map unavailable
                  </div>
                )}
                {assignedTeam && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-200">
                      <MapPin className="h-4 w-4" />
                      <div>
                        <p className="font-semibold">Response Team Assigned</p>
                        <p className="text-xs text-emerald-100/70">
                          {assignedTeam.name} - {assignedTeam.type} response
                        </p>
                        <p className="mt-1 text-xs text-emerald-100/70">ETA: {incident.eta || "Calculating..."}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-orange-300" />
                  <h3 className="font-semibold text-white">Report Image Review</h3>
                </div>
                {incident.photoUrl ? (
                  <img
                    src={incident.photoUrl}
                    alt="User submitted incident evidence"
                    className="max-h-[420px] w-full rounded-2xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/10 p-6 text-center text-slate-300">
                    No report image was attached.
                  </div>
                )}
              </Card>

              <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
                <h3 className="font-semibold text-white">Status Tracking</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  {responseFlow.map((status) => {
                    const currentIndex = responseFlow.indexOf(incident.status as (typeof responseFlow)[number]);
                    const active = incident.status !== "archived_fake" && responseFlow.indexOf(status) <= currentIndex;
                    return (
                      <div key={status} className={active ? "text-orange-300" : "text-slate-600"}>
                        {status === "resolved" ? <CheckCircle2 className="mb-1 h-4 w-4" /> : <Clock3 className="mb-1 h-4 w-4" />}
                        {statusLabels[status]}
                      </div>
                    );
                  })}
                </div>
                {incident.status === "archived_fake" && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-600/40 bg-slate-700/30 p-3 text-sm text-slate-300">
                    <XCircle className="h-4 w-4" />
                    Archived as fake. No team deployment will be created.
                  </div>
                )}
              </Card>

              {canReviewSubmittedReport && (
                <Card className="rounded-2xl border-orange-500/25 bg-[#0b1220] p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-white">Report Review</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Verify this report to move it to Deploy, or mark it fake to move it to History.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      onClick={() => handleResponderReviewStatus("verified")}
                      disabled={updateStatus.isPending || assignTeam.isPending}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {(updateStatus.isPending || assignTeam.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify Report
                    </Button>
                    <Button
                      onClick={() => handleResponderReviewStatus("archived_fake")}
                      disabled={updateStatus.isPending || assignTeam.isPending}
                      className="bg-slate-700 text-white hover:bg-slate-600"
                    >
                      Mark Fake
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </ResponderReviewShell>
    ) : (
    <Shell>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation(backPath)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">Incident Details</h1>
          <MapPin className="h-5 w-5 text-orange-400" />
        </div>
      </div>

      <main className="space-y-4 p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
          </div>
        ) : !incident ? (
          <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-6 text-center text-slate-400">
            Incident not found
          </Card>
        ) : (
          <>
            <Card className="rounded-[2rem] border-orange-500/25 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.22),transparent_36%),linear-gradient(135deg,#0b1220,#050913)] p-5 shadow-xl shadow-orange-950/30">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-orange-500/15 p-3">
                  <Flame className="h-6 w-6 text-orange-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                        {typeInfo.label}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-white">{incident.title}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[incident.status]}`}>
                      {statusLabels[incident.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{incident.description || "No description provided."}</p>
                  <p className="mt-2 text-sm text-orange-200">Report roles: {typeInfo.roles}</p>
                  <p className="mt-3 text-sm text-slate-400">{incident.address || "GPS location captured"}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Incident Location</h3>
                  <p className="text-sm text-slate-400">
                    {hasValidLocation ? `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}` : "No GPS coordinates available"}
                  </p>
                </div>
                <MapPin className="h-5 w-5 text-orange-300" />
              </div>
              {hasValidLocation ? (
                <IncidentMap lat={lat} lng={lng} title={incident.title} safeLocations={safeLocations} />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
                  Location map unavailable
                </div>
              )}
              {!isReviewOnly && hasValidLocation && (
                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-400/15 p-2">
                      <Navigation className="h-5 w-5 text-emerald-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-emerald-100">Road guide to {guideTargetLabel}</p>
                      <p className="mt-1 text-sm text-emerald-100/75">
                        {nearestSafeLocation
                          ? `Nearest ${guideTargetLabel}: ${nearestSafeLocation.name}. Use the road directions from the user's latitude and longitude to the facility longitude and latitude.`
                          : `No ${guideTargetLabel} found near the report GPS yet. Call emergency contacts while responders verify the location.`}
                      </p>
                      {nearestSafeLocation && (
                        <div className="mt-3 grid gap-2 text-xs text-emerald-50/75">
                          <div className="flex items-center gap-2">
                            <Route className="h-4 w-4 text-emerald-200" />
                            <span>{formatDistance(nearestSafeLocation.distance)} - road route available in Maps</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-emerald-200" />
                            <span>{nearestSafeLocation.address}</span>
                          </div>
                          {nearestSafeLocation.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-emerald-200" />
                              <span>{nearestSafeLocation.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {directionsUrl && (
                        <Button
                          onClick={() => window.open(directionsUrl, "_blank", "noopener,noreferrer")}
                          className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Guide me to safe place
                          Guide me to {guideTargetLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!isReviewOnly && safeLocations.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {guideTargetLabel} nearby
                  </h3>
                  {safeLocations.slice(0, 3).map((location) => (
                    <div key={location.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{location.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{location.description}</p>
                          <p className="mt-1 text-xs text-slate-500">{location.address}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
                          {formatDistance(location.distance)}
                        </span>
                      </div>
                      {(location.capacity || location.amenities) && (
                        <div className="mt-3 grid gap-2 text-xs text-slate-400">
                          {location.capacity && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-500" />
                              <span>Capacity: {location.capacity.toLocaleString()}</span>
                            </div>
                          )}
                          {location.amenities && <p>{location.amenities}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {assignedTeam && (
                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm text-emerald-200">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <p className="font-semibold">Response Team Assigned</p>
                      <p className="text-xs text-emerald-100/70">
                        {assignedTeam.name} - {assignedTeam.type} response
                      </p>
                      <p className="mt-1 text-xs text-emerald-100/70">ETA: {incident.eta || "Calculating..."}</p>
                    </div>
                  </div>
                </div>
              )}
              {!assignedTeam && !isReviewOnly && (
                <div className="mt-4 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm text-sky-200">
                    <Radio className="h-4 w-4" />
                    <div>
                      <p className="font-semibold">Waiting for Team Assignment</p>
                      <p className="text-xs text-sky-100/70">
                        {typeInfo.team} will be shown here after verification and team assignment
                      </p>
                      <p className="mt-1 text-xs text-sky-100/70">Route and ETA will be shown when team is assigned</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Camera className="h-5 w-5 text-orange-300" />
                <h3 className="font-semibold text-white">Report Image Review</h3>
              </div>
              {incident.photoUrl ? (
                <img
                  src={incident.photoUrl}
                  alt="User submitted incident evidence"
                  className="max-h-[420px] w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/10 p-6 text-center text-slate-300">
                  No report image was attached.
                </div>
              )}
              {canManageIncident && (
                <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  Review the submitted image with the map location before deploying or resolving the incident.
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
              <h3 className="font-semibold text-white">Status Tracking</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {responseFlow.map((status) => {
                  const currentIndex = responseFlow.indexOf(incident.status as (typeof responseFlow)[number]);
                  const active = incident.status !== "archived_fake" && responseFlow.indexOf(status) <= currentIndex;
                  return (
                    <div key={status} className={active ? "text-orange-300" : "text-slate-600"}>
                      {status === "resolved" ? <CheckCircle2 className="mb-1 h-4 w-4" /> : <Clock3 className="mb-1 h-4 w-4" />}
                      {statusLabels[status]}
                    </div>
                  );
                })}
              </div>
              {incident.status === "archived_fake" && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-600/40 bg-slate-700/30 p-3 text-sm text-slate-300">
                  <XCircle className="h-4 w-4" />
                  Archived as fake. No team deployment will be created.
                </div>
              )}
            </Card>

            {canOpenResponseTools && incident && !canManageIncident && (
              <Card className="rounded-2xl border-amber-500/25 bg-[#0b1220] p-4">
                <div className="flex items-start gap-3 text-sm text-amber-100">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-300" />
                  <div>
                    <h3 className="font-semibold text-white">Different Response Role</h3>
                    <p className="mt-1 text-amber-100/75">
                      This is a {typeInfo.label.toLowerCase()} incident. Open the matching {typeInfo.label} dashboard to verify and assign a response team.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {canManageIncident && (
              <Card className="rounded-2xl border-orange-500/25 bg-[#0b1220] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-orange-300" />
                  <h3 className="font-semibold text-white">{managementTitle}</h3>
                </div>
                <div className="space-y-2">
                  {activeSosAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-white">Active SOS #{alert.id}</p>
                        <p className="text-slate-400">
                          Lat {Number(alert.latitude).toFixed(5)}, Lng {Number(alert.longitude).toFixed(5)}
                        </p>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">Team Assignment</p>
                  {assignedTeam ? (
                    <p className="mt-1 text-sm text-emerald-200">
                      Assigned to {assignedTeam.name} using {assignedTeam.vehicle || "pending vehicle"}.
                    </p>
                  ) : incident.status === "verified" ? (
                    <div className="mt-3 grid gap-2">
                      {assignableTeams.length > 0 ? (
                        assignableTeams.map((team) => (
                          <div key={team.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <div>
                              <p className="font-semibold text-white">{team.name}</p>
                              <p className="text-xs text-slate-400">
                                {team.description || typeInfo.team} - {team.vehicle || "Pending vehicle"} - {team.status.replace("_", " ")}
                              </p>
                            </div>
                            <Button
                              onClick={() => assignTeam.mutate({ incidentId: incident.id, teamId: team.id })}
                              disabled={assignTeam.isPending}
                              className="bg-orange-600 text-white hover:bg-orange-700"
                            >
                              {assignTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Assign Team
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">No available {typeInfo.label.toLowerCase()} team yet. Create or mark a team available in Team Management.</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">Verify the report before assigning a response team.</p>
                  )}
                </div>
                <div className="mt-4 grid gap-2">
                  {incident.status === "submitted" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => updateStatus.mutate({ incidentId: incident.id, status: "verified" })}
                        disabled={updateStatus.isPending}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Verify Report
                      </Button>
                      <Button
                        onClick={() => updateStatus.mutate({ incidentId: incident.id, status: "archived_fake" })}
                        disabled={updateStatus.isPending}
                        className="bg-slate-700 text-white hover:bg-slate-600"
                      >
                        Mark Fake
                      </Button>
                    </div>
                  )}
                  {incident.status === "assigned" && (
                    <Button
                      onClick={() => updateStatus.mutate({ incidentId: incident.id, status: "team_dispatched" })}
                      disabled={updateStatus.isPending}
                      className="w-full bg-orange-600 text-white hover:bg-orange-700"
                    >
                      Mark Team Dispatched
                    </Button>
                  )}
                  {incident.status === "team_dispatched" && (
                    <Button
                      onClick={() => updateStatus.mutate({ incidentId: incident.id, status: "en_route" })}
                      disabled={updateStatus.isPending}
                      className="w-full bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Mark En Route
                    </Button>
                  )}
                  {incident.status === "en_route" && (
                    <Button
                      onClick={() => updateStatus.mutate({ incidentId: incident.id, status: "resolved" })}
                      disabled={updateStatus.isPending}
                      className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Close Incident as Resolved
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
