import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, BarChart3, Flame, Users, FileText, LogOut, MapPin, Radio, User } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getSocketUrl } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AdminShell } from "@/components/AdminBottomNav";

const sosStatusLabel = {
  pending: "Pending Review",
  verified: "Verified",
  suspicious: "Needs Review",
  fake: "Archived Fake",
  dispatched: "Broadcast Complete",
  responding: "Responder En Route",
  help_arrived: "Help Arrived",
  resolved: "Resolved",
};

const sosFlowSteps = [
  { status: "pending", label: "SOS Packet" },
  { status: "verified", label: "Verified" },
  { status: "dispatched", label: "Distributed" },
  { status: "responding", label: "En Route" },
  { status: "help_arrived", label: "Arrived" },
  { status: "resolved", label: "Resolved" },
] as const;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const utilsRef = useRef(utils);

  useEffect(() => {
    utilsRef.current = utils;
  }, [utils]);

  const { data: incidents } = trpc.incidents.list.useQuery({ limit: 10 });
  const { data: activityLog } = trpc.activityLog.list.useQuery({ limit: 5 });
  const { data: sosAlerts } = trpc.sosAlerts.getActive.useQuery();
  const { data: teams } = trpc.teams.list.useQuery({ limit: 20 });

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
    });

    const refreshSosAlerts = () => {
      void utilsRef.current.sosAlerts.getActive.invalidate();
      void utilsRef.current.activityLog.list.invalidate();
    };

    socket.on("sos:created", refreshSosAlerts);
    socket.on("sos:updated", refreshSosAlerts);

    return () => {
      socket.off("sos:created", refreshSosAlerts);
      socket.off("sos:updated", refreshSosAlerts);
      socket.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setLocation("/welcome");
  };

  // Mock statistics
  const stats = [
    { label: "Pending Review", value: incidents?.filter((item) => item.status === "submitted").length || 0, icon: FileText, color: "text-sky-400" },
    { label: "Active Response", value: incidents?.filter((item) => ["assigned", "team_dispatched", "en_route"].includes(item.status)).length || 0, icon: Flame, color: "text-orange-500" },
    { label: "Resolved", value: incidents?.filter((item) => item.status === "resolved").length || 0, icon: AlertTriangle, color: "text-green-500" },
    { label: "SOS Alerts", value: sosAlerts?.length || 0, icon: AlertTriangle, color: "text-orange-500" },
  ];

  return (
    <AdminShell>
      {/* Main Content */}
      <div className="overflow-auto">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Real-time incident monitoring and response coordination</p>
          </div>
          <div className="text-right">
            <p className="text-white font-semibold">{user?.name}</p>
            <p className="text-gray-400 text-xs capitalize">Administrator</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className="bg-slate-800 border-slate-700 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                  </div>
                </Card>
              );
            })}
          </div>

          {(sosAlerts ?? []).length > 0 && (
            <Card className="border-red-500/40 bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.28),transparent_35%),linear-gradient(135deg,#1f1113,#0b1220)] p-6 shadow-2xl shadow-red-950/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-200">SOS Alert Detected</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">High-priority emergency alert</h2>
                  <p className="mt-1 text-sm text-slate-300">Live location and responder request received from citizen dashboard.</p>
                </div>
                <div className="rounded-2xl border border-red-300/30 bg-red-500/20 p-3">
                  <Radio className="h-7 w-7 text-red-200" />
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {(sosAlerts ?? []).map((alert) => {
                  const preferredTeam = teams?.find((team) => {
                    if (alert.emergencyType === "ambulance" || alert.emergencyType === "medical") return team.type === "medical";
                    if (alert.emergencyType === "fire") return team.type === "fire";
                    if (alert.emergencyType === "police") return team.type === "pulis";
                    return false;
                  });
                  const responseTypeLabel =
                    alert.emergencyType === "ambulance" || alert.emergencyType === "medical"
                      ? "Medical"
                      : alert.emergencyType === "fire"
                        ? "Fire"
                        : alert.emergencyType === "police"
                          ? "Police"
                          : "General";
                  const mapLink = `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`;
                  const currentStep = sosFlowSteps.findIndex((step) => step.status === alert.status);
                  const assignedTeamName = alert.assignedTeam ?? preferredTeam?.name ?? "Nearest emergency unit";

                  return (
                    <div key={alert.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">SOS #{alert.id}</h3>
                          <p className="text-sm text-slate-300">{alert.userName} - {alert.userPhone}</p>
                          <p className="mt-1 text-sm capitalize text-red-200">{alert.incidentType ?? `${alert.emergencyType} emergency`}</p>
                          <p className="text-xs text-slate-400">Preferred response: {responseTypeLabel}</p>
                          <p className="text-xs text-slate-400">Team assigned: {assignedTeamName}</p>
                          <p className="text-xs text-slate-400">Priority: {alert.priority.toUpperCase()}</p>
                        </div>
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs uppercase text-red-200">
                          {sosStatusLabel[alert.status]}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
                        {sosFlowSteps.map((step, index) => {
                          const isActive = currentStep >= index;
                          return (
                            <div
                              key={step.status}
                              className={`rounded-xl border px-2 py-2 text-center text-[11px] font-semibold ${
                                isActive
                                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                                  : "border-white/10 bg-white/5 text-slate-500"
                              }`}
                            >
                              {step.label}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                        <div className="flex gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-red-200" />
                          <div>
                            <p className="font-semibold text-white">{alert.address}</p>
                            <p className="text-xs">Lat {Number(alert.latitude).toFixed(4)}, Long {Number(alert.longitude).toFixed(4)}</p>
                            <a href={mapLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-orange-300">
                              Open GPS pin
                            </a>
                          </div>
                        </div>
                      </div>

                      {alert.description && (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                          <p className="font-semibold text-white">Report Details</p>
                          <p className="mt-1">{alert.description}</p>
                          {alert.notes && <p className="mt-2 text-xs text-slate-400">Notes: {alert.notes}</p>}
                          {alert.photoUrl && <img src={alert.photoUrl} alt="SOS uploaded evidence" className="mt-3 max-h-44 w-full rounded-xl object-cover" />}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Recent Incidents */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-slate-800 border-slate-700 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Recent Incidents</h2>
                <div className="space-y-3">
                  {incidents && incidents.length > 0 ? (
                    incidents.map((incident) => (
                      <button
                        key={incident.id}
                        onClick={() => setLocation(`/admin/incidents/${incident.id}`)}
                        className="flex w-full items-start gap-3 rounded-lg bg-slate-700/50 p-3 text-left transition hover:bg-slate-700"
                      >
                        <Flame className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{incident.title}</p>
                          <p className="text-gray-400 text-sm">{incident.address || "Location unknown"}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              incident.severity === "critical"
                                ? "bg-red-500/20 text-red-400"
                                : incident.severity === "high"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {incident.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400">{incident.status.replace("_", " ")}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">No incidents reported</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Activity Feed */}
            <div>
              <Card className="bg-slate-800 border-slate-700 p-6">
                <h2 className="text-lg font-bold text-white mb-4">Activity Feed</h2>
                <div className="space-y-3">
                  {activityLog && activityLog.length > 0 ? (
                    activityLog.map((log) => (
                      <div key={log.id} className="text-sm border-l-2 border-orange-500/30 pl-3">
                        <p className="text-gray-300">{log.action}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">No activity</p>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => setLocation("/admin/map")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6"
            >
              Open Live Maps
            </Button>
            <Button
              onClick={() => setLocation("/admin/key-contacts")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6"
            >
              Key Contact
            </Button>
            <Button
              onClick={() => setLocation("/admin/reports")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-6"
            >
              Review Incidents
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
