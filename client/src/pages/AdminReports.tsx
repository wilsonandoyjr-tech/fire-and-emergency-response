import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { io } from "socket.io-client";
import { getSocketUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Flame } from "lucide-react";
import { AdminShell } from "@/components/AdminBottomNav";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const incidentTypeInfo = {
  fire: { label: "Fire", roles: "Investigator, Fire Fighter" },
  medical: { label: "Medical", roles: "Rescuer" },
  pulis: { label: "Police", roles: "Police Officer, Investigator" },
};

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const [filterType, setFilterType] = useState<"all" | "fire" | "medical" | "pulis">("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "submitted" | "verified" | "assigned" | "team_dispatched" | "en_route" | "resolved" | "archived_fake"
  >("all");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [searchTerm, setSearchTerm] = useState("");

  const utils = trpc.useUtils();
  const { data: incidents } = trpc.incidents.list.useQuery({ limit: 100 });

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const refreshIncidents = () => {
      void utils.incidents.list.invalidate();
    };

    socket.on("incident:created", refreshIncidents);
    socket.on("incident:updated", refreshIncidents);
    socket.on("incident:deleted", refreshIncidents);
    socket.on("deployment:created", refreshIncidents);

    return () => {
      socket.off("incident:created", refreshIncidents);
      socket.off("incident:updated", refreshIncidents);
      socket.off("incident:deleted", refreshIncidents);
      socket.off("deployment:created", refreshIncidents);
      socket.disconnect();
    };
  }, [utils]);

  const filteredIncidents = incidents?.filter((incident) => {
    const tabMatch =
      tab === "active"
        ? !["resolved", "archived_fake"].includes(incident.status)
        : ["resolved", "archived_fake"].includes(incident.status);
    const typeMatch = filterType === "all" || incident.type === filterType;
    const statusMatch = filterStatus === "all" || incident.status === filterStatus;
    const searchMatch =
      searchTerm === "" ||
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.address?.toLowerCase().includes(searchTerm.toLowerCase());

    return tabMatch && typeMatch && statusMatch && searchMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-sky-500/20 text-sky-400";
      case "verified":
        return "bg-cyan-500/20 text-cyan-400";
      case "assigned":
        return "bg-violet-500/20 text-violet-400";
      case "team_dispatched":
        return "bg-orange-500/20 text-orange-400";
      case "en_route":
        return "bg-amber-500/20 text-amber-400";
      case "resolved":
        return "bg-green-500/20 text-green-400";
      case "archived_fake":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "low":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <AdminShell>
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setLocation("/admin/dashboard")} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Incidents</h1>
        <button className="text-orange-500 hover:text-orange-400">
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-1">
          {(["active", "history"] as const).map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                setFilterStatus("all");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                tab === item ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {item === "active" ? "Active Reports" : "History"}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search */}
          <div>
            <Input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Filter Buttons */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(["all", "fire", "medical", "pulis"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`p-2 rounded-lg text-sm font-semibold transition-all ${
                      filterType === type
                        ? "bg-orange-600 text-white"
                        : "bg-slate-800 text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {type === "all" ? "All" : incidentTypeInfo[type].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(["all", "submitted", "verified", "assigned", "team_dispatched", "en_route", "resolved", "archived_fake"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`p-2 rounded-lg text-sm font-semibold transition-all ${
                      filterStatus === status
                        ? "bg-orange-600 text-white"
                        : "bg-slate-800 text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-slate-800 border-slate-700 p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">{tab === "active" ? "Active Reports" : "History Reports"}</p>
            <p className="text-2xl font-bold text-white">{filteredIncidents?.length || 0}</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">{tab === "active" ? "Pending Review" : "Resolved / Archived"}</p>
            <p className="text-2xl font-bold text-orange-400">{filteredIncidents?.filter((i) => tab === "active" ? i.status === "submitted" : true).length || 0}</p>
          </Card>
        </div>

        {/* Incidents List */}
        <div className="space-y-3">
          {filteredIncidents && filteredIncidents.length > 0 ? (
            filteredIncidents.map((incident) => {
              const typeInfo = incidentTypeInfo[incident.type as keyof typeof incidentTypeInfo] ?? incidentTypeInfo.fire;
              return (
              <Card
                key={incident.id}
                onClick={() => setLocation(`/admin/incidents/${incident.id}`)}
                className="bg-slate-800 border-slate-700 p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Flame className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{incident.title}</h3>
                    <p className="text-gray-400 text-sm">{incident.address || "Location unknown"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(incident.severity)}`}>
                    {incident.severity.toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(incident.status)}`}>
                    {incident.status.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                    {typeInfo.label.toUpperCase()}
                  </span>
                </div>

                <p className="mb-3 text-xs text-orange-300">Report roles: {typeInfo.roles}</p>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(incident.createdAt).toLocaleString()}</span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setLocation(`/admin/incidents/${incident.id}`);
                    }}
                    className="text-orange-400 hover:text-orange-300 font-semibold"
                  >
                    Review Details
                  </button>
                </div>

                {tab === "history" && (
                  <p className="mt-3 text-xs text-emerald-300">
                    Moved to history: {new Date(incident.updatedAt ?? incident.createdAt).toLocaleString()}
                  </p>
                )}

                <div className="mt-3 text-xs text-slate-400">
                  Admins can only review incident details and status here.
                </div>
              </Card>
              );
            })
          ) : (
            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <Flame className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
              <p className="text-gray-400">No incidents match your filters</p>
            </Card>
          )}
        </div>

        {/* Export Section */}
        <Card className="bg-slate-800 border-slate-700 p-4 mt-6">
          <h3 className="text-white font-semibold mb-3">Export Incidents</h3>
          <div className="flex gap-2">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
