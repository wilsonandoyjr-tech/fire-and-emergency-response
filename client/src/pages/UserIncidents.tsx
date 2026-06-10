import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { io } from "socket.io-client";
import { Camera, ChevronDown, FileText, Flame, Loader2, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserMobileShell } from "@/components/UserBottomNav";
import { getSocketUrl } from "@/const";
import { getReportOwnerId } from "@/lib/reportOwner";
import { trpc } from "@/lib/trpc";

const statusStyles = {
  submitted: "border-white/20 bg-white/10 text-white",
  verified: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  assigned: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  team_dispatched: "border-orange-400/30 bg-orange-500/10 text-orange-300",
  en_route: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  resolved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  archived_fake: "border-slate-400/30 bg-slate-500/10 text-slate-300",
};

const reportLabels = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  team_dispatched: "Team Dispatched",
  en_route: "En Route",
  resolved: "Resolved",
  archived_fake: "Archived / Fake",
};

const statusFlow = ["submitted", "verified", "assigned", "team_dispatched", "en_route", "resolved"] as const;
const flowLabels = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  team_dispatched: "Team Dispatched",
  en_route: "En Route",
  resolved: "Resolved",
};

const incidentTypeInfo = {
  fire: { role: "Fire", type: "Investigator, Fire Fighter" },
  medical: { role: "Medical", type: "Rescuer" },
  pulis: { role: "Police", type: "Police Officer, Investigator" },
};

export default function UserIncidents() {
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const reportOwnerId = getReportOwnerId();
  const utils = trpc.useUtils();
  const { data: incidents, isLoading } = trpc.incidents.myList.useQuery(
    { limit: 50, ownerId: reportOwnerId },
    { refetchOnMount: true, refetchOnWindowFocus: true },
  );
  const { data: allIncidents, isLoading: isAllIncidentsLoading } = trpc.incidents.list.useQuery(
    { limit: 50 },
    { enabled: !isLoading && (incidents?.length ?? 0) === 0, refetchOnMount: true, refetchOnWindowFocus: true },
  );
  const deleteIncident = trpc.incidents.delete.useMutation({
    onSuccess: async () => {
      setExpandedId(null);
      await utils.incidents.myList.invalidate();
      toast.success("Report deleted from history");
    },
    onError: (error) => toast.error(error.message || "Unable to delete report"),
  });
  const reportItems = incidents && incidents.length > 0 ? incidents : allIncidents ?? [];
  const visibleIncidents = reportItems.filter((incident) =>
    tab === "active" ? !["resolved", "archived_fake"].includes(incident.status) : ["resolved", "archived_fake"].includes(incident.status),
  );

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const refreshReports = () => {
      void utils.incidents.myList.invalidate();
      void utils.incidents.list.invalidate();
    };

    socket.on("incident:created", refreshReports);
    socket.on("incident:updated", refreshReports);
    socket.on("incident:deleted", refreshReports);

    return () => {
      socket.off("incident:created", refreshReports);
      socket.off("incident:updated", refreshReports);
      socket.off("incident:deleted", refreshReports);
      socket.disconnect();
    };
  }, [utils]);

  return (
    <UserMobileShell>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Status tracking</p>
            <h1 className="mt-1 text-2xl font-bold">My Reports</h1>
            <p className="mt-1 text-sm text-slate-400">Track your submitted reports and response progress.</p>
          </div>
          <Button
            onClick={() => setLocation("/user/report")}
            className="h-11 shrink-0 rounded-2xl bg-orange-600 px-3 text-white hover:bg-orange-700"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Report
          </Button>
        </div>
      </header>

      <main className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#0b1220] p-1">
          {(["active", "history"] as const).map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                setExpandedId(null);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                tab === item ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {item === "active" ? "Active Reports" : "History"}
            </button>
          ))}
        </div>

        {isLoading || (incidents?.length === 0 && isAllIncidentsLoading) ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {visibleIncidents.length > 0 ? visibleIncidents.map((incident) => {
              const expanded = expandedId === incident.id;
              const statusIndex = statusFlow.indexOf(incident.status as (typeof statusFlow)[number]);
              const timeline =
                incident.status === "archived_fake"
                  ? [
                      { label: "Submitted", timestamp: incident.createdAt },
                      { label: "Archived / Fake", timestamp: incident.updatedAt ?? incident.createdAt },
                    ]
                  : statusFlow.slice(0, Math.max(statusIndex, 0) + 1).map((status) => ({
                      label: flowLabels[status],
                      timestamp: status === "submitted" ? incident.createdAt : incident.updatedAt ?? incident.createdAt,
                    }));
              const typeInfo = incidentTypeInfo[incident.type as keyof typeof incidentTypeInfo] ?? incidentTypeInfo.fire;
              return (
                <Card
                  key={incident.id}
                  onClick={() => setExpandedId(expanded ? null : incident.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    expanded ? "border-orange-400 bg-orange-500/10" : "border-white/10 bg-[#0b1220]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-orange-500/15 p-3">
                      <Flame className="h-5 w-5 text-orange-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">Report #{incident.id} - {incident.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">{new Date(incident.createdAt).toLocaleString()}</p>
                          <p className="mt-1 text-xs text-orange-300">Role: {typeInfo.role} - Type: {typeInfo.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs uppercase ${statusStyles[incident.status]}`}>
                            {reportLabels[incident.status]}
                          </span>
                          <ChevronDown className={`h-5 w-5 text-slate-500 transition ${expanded ? "rotate-180 text-orange-300" : ""}`} />
                        </div>
                      </div>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{incident.description || "No description added yet."}</p>
                      {tab === "history" && (
                        <p className="mt-2 text-xs text-emerald-300">
                          Moved to history: {new Date(incident.updatedAt ?? incident.createdAt).toLocaleString()}
                        </p>
                      )}

                      {expanded && (
                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                          <div className="rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/10 p-4 text-center">
                            <Camera className="mx-auto h-7 w-7 text-orange-300" />
                            <p className="mt-2 text-sm font-semibold text-white">Evidence on file</p>
                            <p className="text-xs text-slate-400">Open the report details to review your description, image, location, and response status.</p>
                          </div>

                          <div>
                            <h4 className="mb-3 font-semibold text-white">Live Status Timeline</h4>
                            <div className="space-y-3">
                              {timeline.map((item, itemIndex) => {
                                const current = itemIndex === timeline.length - 1 && !["resolved", "archived_fake"].includes(incident.status);
                                return (
                                  <div key={`${item.label}-${itemIndex}`} className="flex gap-3 text-sm">
                                    <span
                                      className={`mt-1 h-3 w-3 rounded-full ${
                                        current ? "bg-orange-300" : itemIndex === 0 ? "bg-white" : "bg-emerald-300"
                                      }`}
                                    />
                                    <div>
                                      <p className={current ? "text-orange-300" : "text-slate-200"}>{item.label}</p>
                                      <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {tab === "history" && (
                            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                              This report was removed from Active Reports after it was resolved or archived.
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              onClick={(event) => {
                                event.stopPropagation();
                                setLocation(`/user/incidents/${incident.id}`);
                              }}
                              className="rounded-2xl bg-orange-600 text-white hover:bg-orange-700"
                            >
                              View Details
                            </Button>
                            {tab === "history" ? (
                              <Button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteIncident.mutate({ incidentId: incident.id, ownerId: reportOwnerId });
                                }}
                                disabled={deleteIncident.isPending}
                                className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
                              >
                                {deleteIncident.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                              </Button>
                            ) : (
                              <Button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toast.success("Report link ready to share");
                                }}
                                className="rounded-2xl bg-slate-700 text-white hover:bg-slate-600"
                              >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            }) : (
              <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-6 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-600" />
                <p className="mt-3 font-semibold text-white">
                  {tab === "active" ? "No active reports" : "No history yet"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {tab === "active" ? "Submitted, verified, assigned, dispatched, and en route reports appear here." : "Resolved and archived reports move here automatically."}
                </p>
              </Card>
            )}
          </div>
        )}
      </main>
    </UserMobileShell>
  );
}
