import { useEffect, useMemo, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import { AlertTriangle, ChevronDown, Flame, Loader2, LocateFixed, Search, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserMobileShell } from "@/components/UserBottomNav";
import { getReportOwnerId } from "@/lib/reportOwner";
import { trpc } from "@/lib/trpc";
import { getSocketUrl } from "@/const";

const statusLabel = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  team_dispatched: "Team Dispatched",
  en_route: "En Route",
  resolved: "Resolved",
  archived_fake: "Archived / Fake",
};

const sosStatusLabel = {
  pending: "Pending",
  verified: "Verified",
  suspicious: "Suspicious",
  dispatched: "Dispatched",
  responding: "Responding",
  help_arrived: "Help Arrived",
  resolved: "Resolved",
  fake: "Marked Fake",
};

const severityColors = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#eab308",
};

const sosColors = {
  police: "#2563eb",
  ambulance: "#ef4444",
  medical: "#ef4444",
  fire: "#f97316",
  admin: "#a855f7",
};

const VALENCIA_CENTER: [number, number] = [7.9043, 125.0928];

const sosRouteGuides = {
  police: {
    title: "Valencia Police Station",
    routeLabel: "Blue navigation route",
    distance: "1.8 km",
    eta: "5 mins",
    instruction: "Turn left in 50 meters.",
    arrivalStatus: "Police Assistance Arrived",
    position: [7.9062, 125.0902] as [number, number],
  },
  ambulance: {
    title: "Valencia Emergency Hospital",
    routeLabel: "Red emergency route",
    distance: "2.3 km",
    eta: "6 mins",
    instruction: "Turn right in 60 meters.",
    arrivalStatus: "Medical Team Arrived",
    position: [7.9083, 125.0945] as [number, number],
  },
  medical: {
    title: "Valencia Emergency Hospital",
    routeLabel: "Red emergency route",
    distance: "2.3 km",
    eta: "6 mins",
    instruction: "Turn right in 60 meters.",
    arrivalStatus: "Medical Team Arrived",
    position: [7.9083, 125.0945] as [number, number],
  },
  fire: {
    title: "Valencia Central Fire Station",
    routeLabel: "Orange fire response route",
    distance: "1.6 km",
    eta: "4 mins",
    instruction: "Move away from smoke and wait near a clear landmark.",
    arrivalStatus: "Fire Team Arrived",
    position: [7.9031, 125.0908] as [number, number],
  },
  admin: {
    title: "Emergency Dispatch Hub",
    routeLabel: "Fastest available route",
    distance: "Within 5 km",
    eta: "Dispatching now",
    instruction: "Stay visible and keep your GPS on.",
    arrivalStatus: "Emergency Help Arrived",
    position: VALENCIA_CENTER,
  },
};

function createPulseIcon(color: string, selected: boolean, label = "") {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position:relative;
        width:${label ? "50px" : "44px"};
        height:${label ? "50px" : "44px"};
        border-radius:999px;
        background:${color};
        display:grid;
        place-items:center;
        box-shadow:0 0 28px ${color}88;
        outline:${selected ? "8px solid rgba(255,255,255,.2)" : "none"};
      ">
        ${
          label
            ? `<span style="position:absolute;inset:-10px;border-radius:999px;background:${color};opacity:.22;animation:pulse 1.4s infinite;"></span>`
            : ""
        }
        <span style="position:relative;z-index:1;width:${label ? "auto" : "18px"};height:${label ? "auto" : "18px"};border-radius:999px;background:${label ? "transparent" : "white"};color:white;font-weight:900;font-size:18px;">${label}</span>
      </div>
    `,
    iconSize: label ? [50, 50] : [44, 44],
    iconAnchor: label ? [25, 25] : [22, 22],
    popupAnchor: [0, -24],
  });
}

function createUserLocationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position:relative;
        width:42px;
        height:42px;
        border-radius:999px;
        background:#2563eb;
        display:grid;
        place-items:center;
        border:4px solid white;
        box-shadow:0 0 24px rgba(37,99,235,.72);
      ">
        <span style="position:absolute;inset:-10px;border-radius:999px;background:#2563eb;opacity:.2;"></span>
        <span style="position:relative;z-index:1;width:12px;height:12px;border-radius:999px;background:white;"></span>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });
}

export default function UserLiveMap() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const utils = trpc.useUtils();
  const reportOwnerId = getReportOwnerId();
  const { data: incidents } = trpc.incidents.myList.useQuery({ limit: 50, ownerId: reportOwnerId });
  const { data: allIncidents } = trpc.incidents.list.useQuery(
    { limit: 50 },
    { enabled: (incidents?.length ?? 0) === 0 },
  );
  const { data: sosAlerts } = trpc.sosAlerts.myActive.useQuery({ limit: 50, ownerId: reportOwnerId });

  // Initialize map
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

  // Socket updates
  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const refreshIncidents = () => {
      void utils.incidents.myList.invalidate();
      void utils.sosAlerts.myActive.invalidate();
    };

    socket.on("incident:created", refreshIncidents);
    socket.on("incident:updated", refreshIncidents);
    socket.on("deployment:created", refreshIncidents);
    socket.on("sos:created", refreshIncidents);
    socket.on("sos:updated", refreshIncidents);

    return () => {
      socket.off("incident:created", refreshIncidents);
      socket.off("incident:updated", refreshIncidents);
      socket.off("deployment:created", refreshIncidents);
      socket.off("sos:created", refreshIncidents);
      socket.off("sos:updated", refreshIncidents);
      socket.disconnect();
    };
  }, [utils]);

  const visibleIncidents = useMemo(() => {
    const items = incidents && incidents.length > 0 ? incidents : allIncidents ?? [];
    if (!search.trim()) return items;
    const needle = search.toLowerCase();
    return items.filter(
      (incident) =>
        incident.title.toLowerCase().includes(needle) ||
        incident.address?.toLowerCase().includes(needle) ||
        incident.status.toLowerCase().includes(needle),
    );
  }, [allIncidents, incidents, search]);

  const visibleSosAlerts = useMemo(() => {
    const items = sosAlerts ?? [];
    if (!search.trim()) return items;
    const needle = search.toLowerCase();
    return items.filter(
      (alert) =>
        alert.address?.toLowerCase().includes(needle) ||
        alert.emergencyType.toLowerCase().includes(needle) ||
        alert.status.toLowerCase().includes(needle) ||
        alert.userName.toLowerCase().includes(needle),
    );
  }, [sosAlerts, search]);

  const selectedIncident = selectedId?.startsWith("incident:")
    ? visibleIncidents.find((incident) => `incident:${incident.id}` === selectedId)
    : null;
  const selectedSos = selectedId?.startsWith("sos:")
    ? visibleSosAlerts.find((alert) => `sos:${alert.id}` === selectedId)
    : null;

  function locateCurrentUser() {
    if (!navigator.geolocation) {
      toast.error("Current location is not available on this device.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setCurrentLocation(nextLocation);
        map.current?.setView([nextLocation.lat, nextLocation.lng], 16, { animate: true });
        setIsLocating(false);
        toast.success("Current location found.");
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to get current location. Please allow location permission.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  // Update markers on map
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add incident markers
    visibleIncidents.forEach((incident) => {
      const lat = Number(incident.latitude);
      const lng = Number(incident.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: createPulseIcon(severityColors[incident.severity], selectedId === `incident:${incident.id}`),
        title: incident.title,
      })
        .bindPopup(`${incident.title}<br>${incident.address || "GPS location attached"}`)
        .addTo(map.current!);
      marker.on("click", () => setSelectedId(`incident:${incident.id}`));

      markersRef.current.set(`incident-${incident.id}`, marker);
    });

    // Add SOS markers
    visibleSosAlerts.forEach((alert) => {
      const lat = Number(alert.latitude);
      const lng = Number(alert.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: createPulseIcon(sosColors[alert.emergencyType], selectedId === `sos:${alert.id}`, "!"),
        title: alert.incidentType ?? `${alert.emergencyType} SOS`,
      })
        .bindPopup(`${alert.incidentType ?? `${alert.emergencyType} SOS`}<br>${alert.address}`)
        .addTo(map.current!);
      marker.on("click", () => setSelectedId(`sos:${alert.id}`));

      markersRef.current.set(`sos-${alert.id}`, marker);
    });

    if (currentLocation) {
      const marker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: createUserLocationIcon(),
        title: "Your current location",
      })
        .bindPopup(
          `Your current location<br>Accuracy: ${
            currentLocation.accuracy ? `${Math.round(currentLocation.accuracy)} meters` : "unavailable"
          }`,
        )
        .addTo(map.current!);

      markersRef.current.set("user-current-location", marker);
    }

    const markerPositions = Array.from(markersRef.current.values()).map((marker) => marker.getLatLng());
    if (markerPositions.length > 0 && !currentLocation) {
      map.current.fitBounds(L.latLngBounds(markerPositions), { padding: [36, 36], maxZoom: 14 });
    }
  }, [visibleIncidents, visibleSosAlerts, selectedId, currentLocation]);

  return (
    <UserMobileShell>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Real-time incidents & SOS</p>
        <h1 className="mt-1 text-2xl font-bold">Live Map</h1>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Valencia City area"
            className="rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
          />
        </div>
      </header>

      <main className="space-y-4 p-4">
        <section className="relative h-80 overflow-hidden rounded-[2rem] border border-orange-500/25 shadow-2xl shadow-orange-950/30">
          <div ref={mapContainer} className="h-full w-full" />

          <Button
            type="button"
            onClick={locateCurrentUser}
            disabled={isLocating}
            className="absolute right-4 top-4 z-[500] rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-700"
          >
            {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
            Locate Me
          </Button>

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur">
            <div className="text-sm text-slate-200">
              {currentLocation
                ? `You are at ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
                : visibleSosAlerts.length > 0
                  ? `${visibleSosAlerts.length} active SOS alert(s) on map`
                  : "Tap Locate Me to show your current location"}
            </div>
          </div>
        </section>

        {visibleSosAlerts.length === 0 && visibleIncidents.length === 0 && (
          <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-6 text-center">
            <MapPin className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3 font-semibold text-white">No live reports yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Your submitted reports and SOS alerts will appear here when available.
            </p>
          </Card>
        )}

        {visibleSosAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Active SOS Tracking</h2>
            <span className="text-xs text-red-300">{visibleSosAlerts.length} live</span>
          </div>
          {visibleSosAlerts.map((alert) => {
              const expanded = selectedId === `sos:${alert.id}`;
              const guide = sosRouteGuides[alert.emergencyType];
              const statusSteps = ["pending", "verified", "dispatched", "responding", "help_arrived", "resolved"] as const;
              const currentIndex = statusSteps.indexOf(alert.status as (typeof statusSteps)[number]);
              return (
                <Card
                  key={alert.id}
                  onClick={() => setSelectedId(expanded ? null : `sos:${alert.id}`)}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    expanded ? "border-red-400 bg-red-500/10" : "border-white/10 bg-[#0b1220]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-red-500/15 p-3">
                      <AlertTriangle className="h-5 w-5 text-red-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{alert.incidentType ?? `${alert.emergencyType} SOS`}</h3>
                          <p className="mt-1 text-sm text-slate-400">{alert.address}</p>
                        </div>
                        <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs uppercase text-red-200">
                          {sosStatusLabel[alert.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Team: {alert.assignedTeam ?? guide.title} - ETA: {alert.eta ?? guide.eta}
                      </p>
                      {expanded && (
                        <div className="mt-4 space-y-3 border-t border-white/10 pt-3 text-sm text-slate-300">
                          <p>Responder: {alert.emergencyType.replace("_", " ").toUpperCase()}</p>
                          <p>GPS: {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}</p>
                          <p>Nearest hub: {guide.title}</p>
                          <p>Route: {guide.routeLabel} - {guide.distance}</p>
                          <p>Live guide: {guide.instruction}</p>
                          <p>Arrival status: {guide.arrivalStatus}</p>
                          {alert.description && <p>Description: {alert.description}</p>}
                          <div className="grid grid-cols-3 gap-2">
                            {statusSteps.map((step, index) => (
                              <div key={step} className={index <= currentIndex ? "text-red-200" : "text-slate-600"}>
                                <ShieldCheck className="mb-1 h-4 w-4" />
                                <span className="text-[10px] leading-tight">{sosStatusLabel[step]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
        </section>
        )}

        {visibleIncidents.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Incidents Nearby</h2>
            <span className="text-xs text-slate-500">{visibleIncidents.length} visible</span>
          </div>
          {visibleIncidents.map((incident) => {
            const expanded = selectedId === `incident:${incident.id}`;
            const isAwaitingDispatch = ["submitted", "verified"].includes(incident.status);
            return (
              <Card
                key={incident.id}
                onClick={() => setSelectedId(expanded ? null : `incident:${incident.id}`)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  expanded ? "border-orange-400 bg-orange-500/10" : "border-white/10 bg-[#0b1220]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-2xl p-3"
                    style={{ backgroundColor: `${severityColors[incident.severity]}26` }}
                  >
                    <Flame className="h-5 w-5" style={{ color: severityColors[incident.severity] }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{incident.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{incident.address || "GPS location attached"}</p>
                        <p className="mt-1 text-sm text-slate-400">{statusLabel[incident.status]}</p>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-slate-500 transition ${expanded ? "rotate-180 text-orange-300" : ""}`} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {isAwaitingDispatch ? "Waiting for dispatch" : incident.eta ? `Estimated arrival: ${incident.eta}` : "Response team status is being updated"}
                    </p>
                    {expanded && (
                      <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-sm text-slate-300">
                        <p>Severity: {incident.severity.toUpperCase()}</p>
                        <p>Response team: {isAwaitingDispatch ? "Not assigned yet" : "Assigned team status is being updated"}</p>
                        <p>Estimated arrival: {incident.eta ?? "Pending update"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
        )}
      </main>
    </UserMobileShell>
  );
}
