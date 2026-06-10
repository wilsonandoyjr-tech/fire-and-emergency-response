import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Bell,
  Camera,
  Clock,
  Flame,
  HeartPulse,
  House,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Radio,
  Share2,
  ShieldCheck,
  UserCog,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserMobileShell } from "@/components/UserBottomNav";
import { getReportOwnerId } from "@/lib/reportOwner";
import { trpc } from "@/lib/trpc";

type EmergencyType = "police" | "medical" | "fire" | "admin";
type ManualEmergencyType = Exclude<EmergencyType, "admin">;
type SosEmergencyType = "police" | "ambulance" | "medical" | "fire" | "admin";
type SosStage = "idle" | "locating" | "select" | "evidence" | "sending" | "sent";

type ResponderOption = {
  type: EmergencyType;
  label: string;
  shortLabel: string;
  description: string;
  phone: string;
  assignedTeam: string;
  distance: string;
  eta: string;
  routeLabel: string;
  routeClass: string;
  iconClass: string;
  instruction: string;
  arrivalStatus: string;
  systemAction: string;
  useCases: string[];
};

const HOLD_DURATION_MS = 3000;
const AUTO_ALERT_MS = 5000;

const fallbackLocation = {
  lat: 7.9042,
  lng: 125.0921,
  address: "Valencia City, Bukidnon",
};

const serviceIcons = {
  police: ShieldCheck,
  medical: HeartPulse,
  fire: Flame,
  admin: UserCog,
};

const manualEmergencyTypes: ManualEmergencyType[] = ["police", "medical", "fire"];
const sosReportTypes: Record<ManualEmergencyType, string[]> = {
  police: ["Threats", "Robbery", "Violence"],
  medical: ["Medical Emergency", "Injury", "Accident"],
  fire: ["Smoke", "Explosion Risk", "Rescue"],
};

function vibrate(pattern: number | number[]) {
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  nav.vibrate?.(pattern);
}

export default function UserHome() {
  const [, setLocation] = useLocation();
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdCountdown, setHoldCountdown] = useState(3);
  const [sosStage, setSosStage] = useState<SosStage>("idle");
  const [selectionCountdown, setSelectionCountdown] = useState(5);
  const [currentLocation, setCurrentLocation] = useState(fallbackLocation);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyType>("admin");
  const [selectedReportType, setSelectedReportType] = useState("Threats");
  const [activeSosId, setActiveSosId] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const holdVibration = useRef<number | null>(null);
  const selectionTimer = useRef<number | null>(null);
  const selectionInterval = useRef<number | null>(null);

  const utils = trpc.useUtils();
  const reportOwnerId = getReportOwnerId();
  const { data: incidents } = trpc.incidents.myList.useQuery({ limit: 5, ownerId: reportOwnerId });
  const { data: notifications } = trpc.notifications.list.useQuery({ limit: 5 });
  const { data: contacts } = trpc.emergencyContacts.list.useQuery();
  const { data: teams } = trpc.teams.list.useQuery({ limit: 20 });
  const sosAlertMutation = trpc.sosAlerts.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sosAlerts.getActive.invalidate(),
        utils.sosAlerts.myActive.invalidate(),
        utils.incidents.list.invalidate(),
        utils.incidents.myList.invalidate(),
      ]);
    },
  });
  const updateSosMutation = trpc.sosAlerts.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.sosAlerts.getActive.invalidate(), utils.sosAlerts.myActive.invalidate()]);
    },
  });

  const emergencyContact = (type: string) => contacts?.find((contact) => contact.type === type);
  const policeTeam = teams?.find((team) => team.type === "pulis" && team.status === "available");
  const fireTeam = teams?.find((team) => team.type === "fire" && team.status === "available");
  const medicalTeam = teams?.find((team) => team.type === "medical" && team.status === "available");
  const adminTeam = teams?.[0];

  const responderOptions: ResponderOption[] = [
    {
      type: "police",
      label: "Police Response",
      shortLabel: "Police",
      description: emergencyContact("police")?.name ?? "Nearest police precinct",
      phone: policeTeam?.contact ?? emergencyContact("police")?.phone ?? "911",
      assignedTeam: policeTeam?.name ?? "Available Police Officer Team",
      distance: "1.8 km",
      eta: "5 mins",
      routeLabel: "Blue navigation route",
      routeClass: "border-blue-500/30 bg-blue-500/10 text-blue-100",
      iconClass: "text-blue-200",
      instruction: "Turn left in 50 meters.",
      arrivalStatus: "Police Assistance Arrived",
      systemAction: "Nearest police station is notified.",
      useCases: ["Crime", "Threats", "Robbery", "Violence"],
    },
    {
      type: "medical",
      label: "Medical Response",
      shortLabel: "Medical",
      description: medicalTeam?.name ?? emergencyContact("ambulance")?.name ?? "Hospital or ambulance unit",
      phone: medicalTeam?.contact ?? emergencyContact("ambulance")?.phone ?? "911",
      assignedTeam: medicalTeam?.name ?? "Ambulance / Medical Unit",
      distance: "2.3 km",
      eta: "6 mins",
      routeLabel: "Red emergency route",
      routeClass: "border-red-500/30 bg-red-500/10 text-red-100",
      iconClass: "text-red-200",
      instruction: "Turn right in 60 meters.",
      arrivalStatus: "Medical Team Arrived",
      systemAction: "Nearest hospital or ambulance unit is notified.",
      useCases: ["Injury", "Accident", "Health emergency", "Ambulance request"],
    },
    {
      type: "fire",
      label: "Fire Response",
      shortLabel: "Fire",
      description: fireTeam?.name ?? emergencyContact("fire_department")?.name ?? "Bureau of Fire Protection",
      phone: fireTeam?.contact ?? emergencyContact("fire_department")?.phone ?? "911",
      assignedTeam: fireTeam?.name ?? "BFP Fire Team",
      distance: "1.6 km",
      eta: "4 mins",
      routeLabel: "Orange fire response route",
      routeClass: "border-orange-500/30 bg-orange-500/10 text-orange-100",
      iconClass: "text-orange-200",
      instruction: "Move away from smoke and wait near a clear landmark.",
      arrivalStatus: "Fire Team Arrived",
      systemAction: "Nearest fire response team is notified.",
      useCases: ["Fire", "Smoke", "Explosion risk", "Rescue"],
    },
    {
      type: "admin",
      label: "Nearest Emergency Hub",
      shortLabel: "Dispatch Hub",
      description: "Automatic dispatch when no response type is selected",
      phone: adminTeam?.contact ?? "911",
      assignedTeam: adminTeam?.name ?? "Emergency Dispatch Hub",
      distance: "Within 5 km",
      eta: "Dispatching now",
      routeLabel: "Fastest available route",
      routeClass: "border-violet-500/30 bg-violet-500/10 text-violet-100",
      iconClass: "text-violet-200",
      instruction: "Stay visible and keep your GPS on.",
      arrivalStatus: "Emergency Help Arrived",
      systemAction: "Nearest emergency center receives the alert instantly.",
      useCases: ["No selection", "Unable to respond", "General emergency"],
    },
  ];

  const getResponderOption = (type: EmergencyType) =>
    responderOptions.find((option) => option.type === type) ?? responderOptions[3];
  const getSosEmergencyType = (type: EmergencyType): SosEmergencyType => (type === "medical" ? "ambulance" : type);

  const selectedOption = getResponderOption(selectedEmergency);
  const directEmergencyCalls = [
    {
      type: "fire",
      label: "Fire Responder",
      detail: fireTeam?.name ?? emergencyContact("fire_department")?.name ?? "Bureau of Fire Protection",
      phone: fireTeam?.contact ?? emergencyContact("fire_department")?.phone ?? "911",
      icon: Flame,
      color: "text-orange-300",
      buttonClass: "bg-orange-600 hover:bg-orange-700",
    },
    {
      type: "medical",
      label: "Medical Responder",
      detail: medicalTeam?.name ?? emergencyContact("ambulance")?.name ?? "Ambulance / Medical Unit",
      phone: medicalTeam?.contact ?? emergencyContact("ambulance")?.phone ?? "911",
      icon: HeartPulse,
      color: "text-emerald-300",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      type: "police",
      label: "Police Responder",
      detail: policeTeam?.name ?? emergencyContact("police")?.name ?? "Nearest police precinct",
      phone: policeTeam?.contact ?? emergencyContact("police")?.phone ?? "911",
      icon: ShieldCheck,
      color: "text-blue-300",
      buttonClass: "bg-blue-600 hover:bg-blue-700",
    },
  ];
  const mapLink = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
  const isBusy = sosAlertMutation.isPending || updateSosMutation.isPending || sosStage === "locating" || sosStage === "sending";

  function resetHold() {
    setHolding(false);
    setHoldProgress(0);
    setHoldCountdown(3);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    if (holdVibration.current) window.clearInterval(holdVibration.current);
    holdTimer.current = null;
    holdInterval.current = null;
    holdVibration.current = null;
  }

  function clearSelectionTimers() {
    if (selectionTimer.current) window.clearTimeout(selectionTimer.current);
    if (selectionInterval.current) window.clearInterval(selectionInterval.current);
    selectionTimer.current = null;
    selectionInterval.current = null;
  }

  function cancelSosFlow() {
    resetHold();
    clearSelectionTimers();
    setSosStage("idle");
    setSelectedEmergency("admin");
    setSelectedReportType("Threats");
    setPhotoPreview(null);
  }

  function handleEmergencySelect(type: EmergencyType) {
    clearSelectionTimers();
    setSelectedEmergency(type);
    if (type !== "admin") {
      setSelectedReportType(sosReportTypes[type][0]);
    }
    setSosStage("evidence");
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.onerror = () => toast.error("Unable to attach that photo");
    reader.readAsDataURL(file);
  }

  function removePhotoEvidence() {
    setPhotoPreview(null);
  }

  function startHold() {
    if (isBusy || sosStage !== "idle") return;

    resetHold();
    clearSelectionTimers();
    setActiveSosId(null);
    setSelectedEmergency("admin");
    setHolding(true);
    setHoldProgress(0);
    setHoldCountdown(3);
    vibrate([40, 40, 40]);

    const startedAt = Date.now();
    holdInterval.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      const secondsLeft = Math.max(1, 3 - Math.floor(elapsed / 1000));
      setHoldProgress(nextProgress);
      setHoldCountdown(secondsLeft);
    }, 80);
    holdVibration.current = window.setInterval(() => vibrate(18), 700);
    holdTimer.current = window.setTimeout(() => {
      resetHold();
      setHoldProgress(100);
      vibrate([90, 60, 90]);
      locateUser();
    }, HOLD_DURATION_MS);
  }

  function cancelHold() {
    if (!holding) return;
    resetHold();
    toast.message("Hold SOS for 3 seconds to activate.");
  }

  function locateUser() {
    setSosStage("locating");

    if (!navigator.geolocation) {
      setCurrentLocation(fallbackLocation);
      setSosStage("select");
      toast.error("GPS unavailable. Using Valencia City fallback location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: fallbackLocation.address,
        };
        setCurrentLocation(location);
        setSosStage("select");
        toast.success("GPS location captured. Choose a response type.");
      },
      () => {
        setCurrentLocation(fallbackLocation);
        setSosStage("select");
        toast.error("Unable to get GPS. Using Valencia City fallback location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function submitSosPacket(type: EmergencyType, autoAlert = false) {
    if (sosAlertMutation.isPending || updateSosMutation.isPending) return;

    clearSelectionTimers();
    const option = getResponderOption(type);
    const timestamp = new Date().toISOString();
    setSelectedEmergency(type);
    setSosStage("sending");

    try {
      const reportType = autoAlert || type === "admin" ? type : selectedReportType;
      const alert = await sosAlertMutation.mutateAsync({
        ownerId: reportOwnerId,
        emergencyType: getSosEmergencyType(type),
        incidentType: reportType,
        description: autoAlert
          ? "No emergency type was selected within 5 seconds. Auto-alert sent to the nearest emergency hub."
          : `${option.label} requested for ${reportType}. ${photoPreview ? "Photo evidence attached." : ""}`,
        latitude: currentLocation.lat.toString(),
        longitude: currentLocation.lng.toString(),
        address: currentLocation.address,
        photoUrl: photoPreview ?? undefined,
        notes: `Timestamp: ${timestamp}. GPS link: ${mapLink}. ${option.routeLabel}.`,
        priority: type === "admin" ? "high" : "critical",
        assignedTeam: option.assignedTeam,
      });

      setActiveSosId(alert.id);
      setSosStage("sent");
      toast.success(autoAlert ? "Auto alert sent to nearest emergency hub." : `${option.shortLabel} alert sent.`);
    } catch (error) {
      setSosStage(autoAlert ? "select" : "evidence");
      toast.error("Unable to send SOS alert. Call 911 if you need immediate help.");
    }
  }

  async function markEmergencyResolved() {
    if (!activeSosId) {
      cancelSosFlow();
      return;
    }

    await updateSosMutation.mutateAsync({
      alertId: activeSosId,
      status: "resolved",
      resolutionNotes: "User ended SOS live guide from the mobile app.",
    });
    setActiveSosId(null);
    setSosStage("idle");
    toast.success("SOS marked resolved.");
  }

  async function shareLocation() {
    const text = `My SOS location: ${currentLocation.address}. GPS: ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}. ${mapLink}`;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };

    try {
      if (nav.share) {
        await nav.share({ title: "SOS Live Location", text, url: mapLink });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("SOS location copied.");
      }
    } catch (error) {
      toast.error("Unable to share location from this device.");
    }
  }

  useEffect(() => {
    if (sosStage !== "select") return;

    setSelectionCountdown(5);
    selectionInterval.current = window.setInterval(() => {
      setSelectionCountdown((current) => Math.max(current - 1, 0));
    }, 1000);
    selectionTimer.current = window.setTimeout(() => {
      void submitSosPacket("admin", true);
    }, AUTO_ALERT_MS);

    return () => clearSelectionTimers();
  }, [sosStage]);

  useEffect(() => {
    return () => {
      resetHold();
      clearSelectionTimers();
    };
  }, []);

  return (
    <UserMobileShell>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">{currentLocation.address}</p>
            <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-400">Quick Help. Right Response. Safer Community.</p>
          </div>
          <div className="flex flex-col gap-2">
            <button className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300">
              <Bell className="h-5 w-5" />
              {notifications && notifications.length > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />}
            </button>
            <button
              aria-label="Back to welcome dashboard"
              onClick={() => setLocation("/welcome")}
              className="rounded-xl border border-blue-500/50 bg-blue-600/20 p-2 text-blue-300 transition hover:bg-blue-600/30"
            >
              <House className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-5 p-4">
        <section className="rounded-[2rem] border border-red-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.34),transparent_38%),linear-gradient(135deg,#101827,#050913)] p-5 text-center shadow-2xl shadow-red-950/40">
          <button
            aria-label="Hold SOS for three seconds"
            disabled={isBusy || sosStage !== "idle"}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onKeyDown={(event) => {
              if ((event.key === " " || event.key === "Enter") && !holding) {
                event.preventDefault();
                startHold();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                cancelHold();
              }
            }}
            className={`relative mx-auto flex h-44 w-44 touch-none select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-red-800 shadow-2xl shadow-red-900/50 transition ${
              holding ? "scale-95 ring-8 ring-red-400/20" : "hover:scale-105"
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            <span className="absolute bottom-0 left-0 right-0 bg-white/20 transition-all" style={{ height: `${holdProgress}%` }} />
            <span className="absolute inset-0 rounded-full border-4 border-red-200/40 animate-pulse" />
            {holding ? (
              <span className="relative text-center">
                <span className="block text-6xl font-black text-white">{holdCountdown}</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-red-100">keep holding</span>
              </span>
            ) : (
              <span className="relative text-center">
                <AlertTriangle className="mx-auto mb-2 h-12 w-12 text-white" />
                <span className="block text-2xl font-black text-white">SOS</span>
                <span className="mt-1 block text-xs font-semibold text-red-100">HOLD 3 SEC</span>
              </span>
            )}
          </button>
          <p className="mt-4 text-sm font-semibold text-white">
            {holding ? "Phone vibration and countdown are active." : "Press and hold SOS to start emergency mode."}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <MapPin className="h-3.5 w-3.5" />
            GPS auto-capture ready
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2 text-center text-[11px] text-slate-300">
          {[
            ["1", "Hold SOS"],
            ["2", "GPS"],
            ["3", "Select"],
            ["4", "Guide"],
          ].map(([step, label]) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
              <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-red-500/20 font-bold text-red-100">{step}</span>
              <span className="mt-2 block leading-tight">{label}</span>
            </div>
          ))}
        </section>

        <Card className="rounded-2xl border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <Flame className="mt-1 h-5 w-5 text-orange-300" />
            <div>
              <h2 className="font-semibold text-white">Active Local Alerts</h2>
              <p className="text-sm text-slate-300">
                {incidents && incidents.length > 0 ? `${incidents.length} incident(s) currently visible near Valencia City` : "No active incidents in your area"}
              </p>
            </div>
          </div>
        </Card>

        <Button
          onClick={() => setLocation("/user/report")}
          className="h-16 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-base font-semibold text-white shadow-lg shadow-orange-950/40"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Report
        </Button>

        <Card className="rounded-2xl border-sky-500/25 bg-sky-500/10 p-4">
          <div>
            <h2 className="font-semibold text-white">Direct Emergency Call</h2>
            <p className="mt-1 text-sm text-slate-300">Call the responder type you need.</p>
          </div>
          <div className="mt-4 grid gap-3">
            {directEmergencyCalls.map((call) => {
              const Icon = call.icon;

              return (
                <div key={call.type} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-2xl bg-white/5 p-2">
                      <Icon className={`h-5 w-5 ${call.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{call.label}</p>
                      <p className="truncate text-sm text-slate-400">{call.detail}</p>
                      <p className="text-sm text-sky-200">{call.phone}</p>
                    </div>
                  </div>
                  <a href={`tel:${call.phone}`} className="shrink-0">
                    <Button className={`rounded-2xl text-white ${call.buttonClass}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </Card>
      </main>

      {sosStage !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/75 px-4 py-6">
          <Card className="w-full max-w-sm rounded-3xl border-red-500/40 bg-[#101827] p-5 shadow-2xl shadow-red-950/50">
            {sosStage === "locating" && (
              <div className="py-5 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-red-300" />
                <h2 className="mt-4 text-xl font-bold text-white">Activating GPS...</h2>
                <p className="mt-2 text-sm text-slate-300">Checking location permission and preparing real-time coordinates.</p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-slate-300">
                  <p>Permission check: GPS access</p>
                  <p>Emergency mode: active</p>
                  <p>Target radius: 5 km nearest responder search</p>
                </div>
              </div>
            )}

            {sosStage === "select" && (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <AlertTriangle className="h-10 w-10 text-red-300" />
                    <h2 className="mt-3 text-xl font-bold text-white">Choose Emergency Type</h2>
                    <p className="mt-1 text-sm text-slate-400">No choice sends an automatic hub alert.</p>
                  </div>
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-red-100">
                    <Clock className="mx-auto h-4 w-4" />
                    <span className="mt-1 block text-2xl font-black">{selectionCountdown}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="font-semibold">GPS location captured</p>
                  <p className="text-xs">Lat {currentLocation.lat.toFixed(4)}, Long {currentLocation.lng.toFixed(4)}</p>
                  <p className="mt-1 text-xs">Select Police, Medical, or Fire first. After that you can add image evidence.</p>
                </div>

                <div className="mt-4 grid gap-3">
                  {manualEmergencyTypes.map((type) => {
                    const option = getResponderOption(type);
                    const Icon = serviceIcons[option.type];

                    return (
                      <button
                        key={option.type}
                        onClick={() => handleEmergencySelect(option.type)}
                        disabled={isBusy}
                        className={`rounded-2xl border p-3 text-left transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60 ${option.routeClass}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-white/10 p-2">
                            <Icon className={`h-5 w-5 ${option.iconClass}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white">{option.label}</p>
                            <p className="mt-1 text-xs text-slate-300">{option.useCases.join(" - ")}</p>
                            <p className="mt-2 text-xs">{option.systemAction} Tap to add evidence before sending.</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                              <span className="rounded-full bg-black/20 px-2 py-1">{option.distance}</span>
                              <span className="rounded-full bg-black/20 px-2 py-1">ETA {option.eta}</span>
                              <span className="rounded-full bg-black/20 px-2 py-1">{option.routeLabel}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs text-violet-100">
                  Auto alert in {selectionCountdown}s sends GPS to the nearest emergency hub within 5 km.
                </div>

                <Button onClick={cancelSosFlow} variant="outline" className="mt-4 w-full rounded-2xl text-slate-200">
                  Cancel SOS
                </Button>
              </div>
            )}

            {sosStage === "evidence" && (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Camera className="h-10 w-10 text-orange-300" />
                    <h2 className="mt-3 text-xl font-bold text-white">Add Photo Evidence</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedOption.shortLabel} selected. Add an image or take a photo so the assigned team can review it in details.
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-3 py-2 text-center text-xs ${selectedOption.routeClass}`}>
                    <span className="block font-semibold text-white">{selectedOption.shortLabel}</span>
                    <span className="mt-1 block">{selectedOption.eta}</span>
                  </div>
                </div>

                {selectedEmergency !== "admin" && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-200">Report Type</p>
                    <div className="mt-2 grid gap-2">
                      {sosReportTypes[selectedEmergency as ManualEmergencyType].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedReportType(type)}
                          className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                            selectedReportType === type
                              ? "border-red-400/60 bg-red-500/20 text-white"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="font-semibold">GPS ready for report details</p>
                  <p className="text-xs">Lat {currentLocation.lat.toFixed(4)}, Long {currentLocation.lng.toFixed(4)}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  {photoPreview ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-200">
                          <Camera className="h-4 w-4 text-orange-300" />
                          <span className="font-semibold">Photo evidence attached</span>
                        </div>
                        <button
                          type="button"
                          onClick={removePhotoEvidence}
                          className="rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          aria-label="Remove photo evidence"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                      <img src={photoPreview} alt="SOS evidence preview" className="h-44 w-full rounded-xl object-cover" />
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-3 text-left transition hover:border-orange-300/70">
                      <div className="rounded-2xl bg-orange-500/15 p-2">
                        <Camera className="h-5 w-5 text-orange-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">Take photo or choose image</p>
                        <p className="mt-1 text-xs text-slate-400">Optional evidence will be attached to the SOS and incident details.</p>
                      </div>
                      <Plus className="h-5 w-5 text-slate-400" />
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <Button
                  onClick={() => void submitSosPacket(selectedEmergency)}
                  disabled={isBusy}
                  className="mt-4 w-full rounded-2xl bg-red-600 text-white hover:bg-red-700"
                >
                  Send {selectedOption.shortLabel} SOS
                </Button>
                <Button onClick={() => setSosStage("select")} variant="outline" className="mt-3 w-full rounded-2xl text-slate-200">
                  Change Report Type
                </Button>
                <Button onClick={cancelSosFlow} variant="outline" className="mt-3 w-full rounded-2xl text-slate-200">
                  Cancel SOS
                </Button>
              </div>
            )}

            {sosStage === "sending" && (
              <div className="py-5 text-center">
                <Radio className="mx-auto h-11 w-11 animate-pulse text-red-300" />
                <h2 className="mt-4 text-xl font-bold text-white">Sending SOS Packet</h2>
                <p className="mt-2 text-sm text-slate-300">Nearby responders, emergency center, and dispatch dashboard are being notified.</p>
                <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm text-slate-200">
                  <p>Emergency: {selectedOption.label}</p>
                  <p>Report Type: {selectedEmergency === "admin" ? "Auto Dispatch" : selectedReportType}</p>
                  <p>GPS: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</p>
                  <p>Timestamp: {new Date().toLocaleTimeString()}</p>
                  <p>Responder: {selectedOption.assignedTeam}</p>
                  <p>Evidence: {photoPreview ? "Photo attached for review" : "No photo attached"}</p>
                </div>
              </div>
            )}

            {sosStage === "sent" && (
              <div>
                <ShieldCheck className="mx-auto h-12 w-12 text-emerald-300" />
                <h2 className="mt-3 text-center text-xl font-bold text-white">Guide</h2>
                <p className="mt-2 text-center text-sm text-slate-300">SOS sent. Follow the live guide while responders move to your GPS location.</p>

                <div className={`mt-4 rounded-2xl border p-3 text-sm ${selectedOption.routeClass}`}>
                  <div className="flex items-start gap-3">
                    <Navigation className={`mt-1 h-5 w-5 ${selectedOption.iconClass}`} />
                    <div>
                      <p className="font-semibold text-white">{selectedOption.routeLabel}</p>
                      <p className="mt-1">Nearest unit: {selectedOption.assignedTeam}</p>
                      <p>Distance: {selectedOption.distance}</p>
                      <p>ETA: {selectedOption.eta}</p>
                      <p className="mt-2 text-xs">Live guide: {selectedOption.instruction}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-300">
                  {["Alert received", "Responder approaching", selectedOption.arrivalStatus].map((label, index) => (
                    <div key={label} className={index === 0 ? "rounded-2xl bg-emerald-500/15 p-2 text-emerald-100" : "rounded-2xl bg-white/5 p-2"}>
                      <ShieldCheck className="mx-auto mb-1 h-4 w-4" />
                      <span className="leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  <a href={`tel:${selectedOption.phone}`}>
                    <Button className="w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                      <Phone className="mr-2 h-4 w-4" />
                      Call {selectedOption.shortLabel}
                    </Button>
                  </a>
                  <Button onClick={shareLocation} className="w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Live Location
                  </Button>
                  <Button onClick={() => setLocation("/user/live-map")} className="w-full rounded-2xl bg-red-600 text-white hover:bg-red-700">
                    <Navigation className="mr-2 h-4 w-4" />
                    Open Live Map
                  </Button>
                  <Button
                    onClick={() => void markEmergencyResolved()}
                    disabled={updateSosMutation.isPending}
                    variant="outline"
                    className="rounded-2xl text-slate-200"
                  >
                    Emergency Resolved
                  </Button>
                </div>

                <p className="mt-4 break-all text-xs text-slate-500">GPS link: {mapLink}</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </UserMobileShell>
  );
}
