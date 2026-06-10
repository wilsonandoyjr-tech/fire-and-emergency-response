import { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { AdminShell } from "@/components/AdminBottomNav";
import { trpc } from "@/lib/trpc";
import { Activity, Ambulance, ArrowLeft, Flame, MapPin, Shield } from "lucide-react";

const VALENCIA_CENTER: [number, number] = [7.9043, 125.0928];

const roleFilters = [
  { id: "all", label: "All Roles", icon: Activity },
  { id: "fire", label: "Fire", icon: Flame },
  { id: "medical", label: "Medical", icon: Ambulance },
  { id: "pulis", label: "Police", icon: Shield },
] as const;

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  team_dispatched: "Dispatched",
  en_route: "En Route",
  resolved: "Resolved",
  archived_fake: "Archived / Fake",
};

const statusStyles: Record<string, string> = {
  submitted: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  verified: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  assigned: "border-orange-400/30 bg-orange-500/10 text-orange-200",
  team_dispatched: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  en_route: "border-blue-400/30 bg-blue-500/10 text-blue-200",
  resolved: "border-green-400/30 bg-green-500/10 text-green-200",
  archived_fake: "border-slate-400/30 bg-slate-500/10 text-slate-200",
};

function getIncidentRole(type: unknown) {
  return String(type);
}

function getRoleStyle(type: string) {
  if (type === "fire") {
    return {
      icon: Flame,
      pin: "#dc2626",
      card: "bg-red-500/15",
      iconColor: "text-red-300",
      badge: "bg-red-500/10 text-red-200",
    };
  }

  if (type === "pulis") {
    return {
      icon: Shield,
      pin: "#2563eb",
      card: "bg-blue-500/15",
      iconColor: "text-blue-300",
      badge: "bg-blue-500/10 text-blue-200",
    };
  }

  return {
    icon: Ambulance,
    pin: "#059669",
    card: "bg-emerald-500/15",
    iconColor: "text-emerald-300",
    badge: "bg-emerald-500/10 text-emerald-200",
  };
}

function createIncidentIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:44px;
        height:44px;
        border-radius:999px;
        border:3px solid rgba(255,255,255,.78);
        background:${color};
        display:grid;
        place-items:center;
        box-shadow:0 0 24px ${color}80;
      ">
        <span style="width:14px;height:14px;border-radius:999px;background:white;display:block;"></span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

export default function AdminMap() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<(typeof roleFilters)[number]["id"]>("all");
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { data: incidents } = trpc.incidents.list.useQuery({ limit: 100 });

  const filteredIncidents = useMemo(() => {
    const items = incidents ?? [];
    return role === "all" ? items : items.filter((incident) => getIncidentRole(incident.type) === role);
  }, [incidents, role]);

  const activeCount = filteredIncidents.filter((incident) => !["resolved", "archived_fake"].includes(incident.status)).length;
  const resolvedCount = filteredIncidents.filter((incident) => incident.status === "resolved").length;
  const fireCount = (incidents ?? []).filter((incident) => getIncidentRole(incident.type) === "fire").length;
  const medicalCount = (incidents ?? []).filter((incident) => getIncidentRole(incident.type) === "medical").length;
  const pulisCount = (incidents ?? []).filter((incident) => getIncidentRole(incident.type) === "pulis").length;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: VALENCIA_CENTER,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when filtered incidents change
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add markers for filtered incidents
    filteredIncidents.slice(0, 50).forEach((incident) => {
      const lat = Number(incident.latitude);
      const lng = Number(incident.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const roleStyle = getRoleStyle(incident.type);
      const marker = L.marker([lat, lng], {
        icon: createIncidentIcon(roleStyle.pin),
        title: incident.title,
      })
        .bindPopup(`${incident.title}<br>${incident.address || "GPS location attached"}`)
        .addTo(map.current!);
      marker.on("click", () => setLocation(`/admin/incidents/${incident.id}`));

      markersRef.current.set(`incident-${incident.id}`, marker);
    });

    const markerPositions = Array.from(markersRef.current.values()).map((marker) => marker.getLatLng());
    if (markerPositions.length > 0) {
      map.current.fitBounds(L.latLngBounds(markerPositions), { padding: [36, 36], maxZoom: 14 });
    }
  }, [filteredIncidents, setLocation]);


  return (
    <AdminShell>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation("/admin/dashboard")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">Live Maps</h1>
          <MapPin className="h-5 w-5 text-orange-400" />
        </div>
      </div>

      <main className="space-y-5 p-4">
        <Card className="rounded-[2rem] border-orange-500/25 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.24),transparent_34%),linear-gradient(135deg,#0b1220,#050913)] p-5 shadow-2xl shadow-orange-950/40">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Maps incident history by role</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Track fire, medical, and police incidents from one map view</h2>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <SummaryCard label="Active" value={activeCount} />
            <SummaryCard label="Resolved" value={resolvedCount} />
            <SummaryCard label="Shown" value={filteredIncidents.length} />
          </div>
        </Card>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {roleFilters.map((item) => {
            const Icon = item.icon;
            const active = role === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setRole(item.id)}
                className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                  active ? "border-orange-400 bg-orange-500/15 text-orange-100" : "border-white/10 bg-[#0b1220] text-slate-300"
                }`}
              >
                <Icon className="mx-auto mb-1 h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </section>

        <Card className="relative overflow-hidden rounded-[2rem] border-white/10 bg-[#07111b]">
          <div ref={mapContainer} style={{ width: "100%", height: "360px" }} />

          <div className="absolute bottom-3 left-3 z-[2] flex gap-3 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-slate-200">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Fire {fireCount}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Medical {medicalCount}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Police {pulisCount}</span>
          </div>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Incident History</h2>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{role === "all" ? "All Roles" : `${role} role`}</span>
          </div>

          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((incident) => {
              const roleStyle = getRoleStyle(incident.type);
              const RoleIcon = roleStyle.icon;
              return (
                <button
                  key={incident.id}
                  onClick={() => setLocation(`/admin/incidents/${incident.id}`)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1220] p-4 text-left transition hover:border-orange-400/60"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl p-3 ${roleStyle.card}`}>
                      <RoleIcon className={`h-5 w-5 ${roleStyle.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-semibold text-white">{incident.title}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs uppercase ${statusStyles[incident.status] ?? statusStyles.submitted}`}>
                          {statusLabels[incident.status] ?? incident.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{incident.address || "GPS location attached"}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 uppercase ${roleStyle.badge}`}>
                          {incident.type} role
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-300">
                          {incident.severity} priority
                        </span>
                      </div>
                    </div>
                    <Shield className="mt-1 h-5 w-5 text-slate-500" />
                  </div>
                </button>
              );
            })
          ) : (
            <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-6 text-center">
              <p className="text-slate-400">No incident history found for this role.</p>
            </Card>
          )}
        </section>
      </main>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
