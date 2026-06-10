import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Flame, HeartPulse, Loader2, MapPin, Plus, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserMobileShell } from "@/components/UserBottomNav";
import { getReportOwnerId } from "@/lib/reportOwner";
import { trpc } from "@/lib/trpc";

type IncidentType = "fire" | "medical" | "pulis";

const descriptionOptions: Record<IncidentType, string[]> = {
  fire: ["Smoke", "Explosion Risk", "Rescue"],
  medical: ["Medical Emergency", "Injury", "Accident"],
  pulis: ["Threats", "Robbery", "Violence"],
};

const incidentTypes = [
  {
    type: "fire" as const,
    icon: Flame,
    label: "Fire",
  },
  {
    type: "medical" as const,
    icon: HeartPulse,
    label: "Medical",
  },
  {
    type: "pulis" as const,
    icon: Shield,
    label: "Police",
  },
];

const defaultValenciaLocation = {
  lat: 7.9043,
  lng: 125.0928,
};

export default function ReportIncident() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const reportOwnerId = getReportOwnerId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [incidentType, setIncidentType] = useState<IncidentType>("fire");
  const [locationText, setLocationText] = useState("");
  const [selectedDescription, setSelectedDescription] = useState<string>(descriptionOptions.fire[0]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const createIncidentMutation = trpc.incidents.create.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.incidents.list.invalidate(), utils.incidents.myList.invalidate()]);
    },
  });

  const handleGetLocation = (showSuccessToast = true) => {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(coordinates);
        setLocationText((current) =>
          current.trim() ? current : `GPS: ${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
        );
        setIsLocating(false);
        if (showSuccessToast) toast.success("Current location captured");
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to get your current location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  useEffect(() => {
    handleGetLocation(false);
  }, []);

  useEffect(() => {
    setSelectedDescription(descriptionOptions[incidentType][0]);
  }, [incidentType]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((previews) => setPhotoPreviews((current) => [...current, ...previews].slice(0, 4)))
      .catch(() => toast.error("Unable to attach that photo"));
  };

  const handleSubmit = async () => {
    if (!locationText.trim()) {
      toast.error("Please add the incident location");
      return;
    }

    const coordinates = userLocation ?? defaultValenciaLocation;
    const typeLabel = incidentType === "fire" ? "Fire" : incidentType === "pulis" ? "Police" : "Medical";

    try {
      await createIncidentMutation.mutateAsync({
        ownerId: reportOwnerId,
        title: `${typeLabel} incident at ${locationText.trim()}`,
        description: selectedDescription,
        type: incidentType,
        latitude: coordinates.lat.toString(),
        longitude: coordinates.lng.toString(),
        address: locationText.trim(),
        photoUrl: photoPreviews[0],
        severity: incidentType === "medical" || incidentType === "pulis" ? "high" : "medium",
      });

      toast.success(`${typeLabel} report sent to ${typeLabel} dashboard`);
      setLocation("/user/reports");
    } catch {
      toast.error("Failed to submit report");
    }
  };

  return (
    <UserMobileShell>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/user/reports")}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
            aria-label="Back to reports"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">User report</p>
            <h1 className="text-2xl font-bold text-white">Add Report</h1>
          </div>
        </div>
      </header>

      <main className="space-y-4 p-4">
        <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
          <label className="text-sm font-semibold text-slate-200">Role</label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {incidentTypes.map((item) => {
              const Icon = item.icon;
              const selected = incidentType === item.type;

              return (
                <button
                  key={item.type}
                  onClick={() => setIncidentType(item.type)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected ? "border-orange-400 bg-orange-500/15 text-white" : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <Icon className={selected ? "h-6 w-6 text-orange-300" : "h-6 w-6 text-slate-400"} />
                  <span className="mt-3 block font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
          <label htmlFor="report-location" className="text-sm font-semibold text-slate-200">
            Location
          </label>
          <div className="mt-3 space-y-3">
            <Input
              id="report-location"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder="Street, barangay, landmark, or building"
              className="h-12 rounded-2xl border-white/10 bg-slate-950 text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => handleGetLocation()}
              disabled={isLocating}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/10 px-4 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-white">Use current location</span>
                <span className="text-xs text-slate-400">
                  {isLocating
                    ? "Getting your GPS location..."
                    : userLocation
                    ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                    : "Optional GPS pin for faster response"}
                </span>
              </span>
              {isLocating ? <Loader2 className="h-5 w-5 animate-spin text-orange-300" /> : <MapPin className="h-5 w-5 text-orange-300" />}
            </button>
          </div>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
          <label htmlFor="report-description" className="text-sm font-semibold text-slate-200">
            Description
          </label>
          <select
            id="report-description"
            value={selectedDescription}
            onChange={(event) => setSelectedDescription(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-orange-500"
          >
            {descriptionOptions[incidentType].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-[#0b1220] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Upload Photos</h2>
              <p className="mt-1 text-xs text-slate-400">Optional, up to 4 photos</p>
            </div>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl bg-slate-700 text-white hover:bg-slate-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {photoPreviews.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {photoPreviews.map((preview, index) => (
                <div key={`${preview.slice(0, 24)}-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10">
                  <img src={preview} alt={`Incident upload ${index + 1}`} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 w-full rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center"
            >
              <Camera className="mx-auto h-7 w-7 text-orange-300" />
              <span className="mt-2 block text-sm font-semibold text-white">Take or upload photo</span>
            </button>
          )}
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={createIncidentMutation.isPending}
          className="h-14 w-full rounded-2xl bg-orange-600 text-base font-semibold text-white hover:bg-orange-700"
        >
          {createIncidentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </main>
    </UserMobileShell>
  );
}
