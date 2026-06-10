import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Flame, AlertTriangle, MapPin, Radio, Users } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const dashboardTimer = useRef<number | null>(null);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

  const openUserDashboard = () => {
    if (isOpeningDashboard) return;

    setIsOpeningDashboard(true);
    dashboardTimer.current = window.setTimeout(() => {
      setLocation("/user/home");
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (dashboardTimer.current) window.clearTimeout(dashboardTimer.current);
    };
  }, []);

  const features = [
    {
      icon: AlertTriangle,
      title: "Real-time Alerts",
      description: "Instant notifications for fire incidents and emergencies",
    },
    {
      icon: MapPin,
      title: "Emergency Resources",
      description: "Find fire stations, hospitals, evacuation centers, and weather updates",
    },
    {
      icon: Users,
      title: "Team Coordination",
      description: "Manage response teams and incident assignments",
    },
  ];
  const phoneScreens = [
    { title: "Home", detail: "SOS + nearby incidents", icon: AlertTriangle },
    { title: "Incident Details", detail: "Map, GPS, image review", icon: MapPin },
      { title: "Key Contact", detail: "Emergency directory", icon: Radio },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header with Logo */}
      <div className="pt-12 pb-8 px-4">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-full">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Fire Alert</h1>
            <p className="text-orange-400 text-xs font-semibold">Emergency Response System</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        {/* Tagline */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Stay Alert, Stay Safe</h2>
          <p className="text-gray-300 text-base">
            Coordinated emergency response for faster incident management
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 mb-12">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/50 border border-orange-500/20 rounded-lg p-6 hover:border-orange-500/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-orange-500/20 p-3 rounded-lg flex-shrink-0">
                    <Icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-12 space-y-6">
          <div className="rounded-3xl border border-orange-500/25 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.25),transparent_38%),linear-gradient(135deg,#050913,#0b1220)] p-5 shadow-2xl shadow-orange-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">System Architecture</p>
            <h3 className="mt-2 text-2xl font-bold text-white">From report to response</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {phoneScreens.map((screen) => {
                const Icon = screen.icon;
                return (
                  <div key={screen.title} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4 shadow-lg shadow-orange-950/20">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="h-2 w-12 rounded-full bg-white/20"></span>
                      <Icon className="h-5 w-5 text-orange-300" />
                    </div>
                    <h4 className="font-semibold text-white">{screen.title}</h4>
                    <p className="mt-1 text-sm text-slate-400">{screen.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-8 space-y-4">
        <div className="rounded-3xl border border-orange-500/20 bg-slate-950/70 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Citizen / User</p>
          <h3 className="mt-2 text-xl font-bold text-white">Automatic access to the user dashboard</h3>
          <p className="mt-2 text-sm text-slate-400">No login required — access SOS reporting, live map, and incident status immediately.</p>
          <Button
            disabled={isOpeningDashboard}
            onClick={openUserDashboard}
            className="mx-auto mt-5 flex aspect-square h-40 w-40 rounded-full bg-gradient-to-br from-orange-500 to-red-600 p-5 text-center text-sm font-semibold leading-tight text-white shadow-2xl shadow-red-950/40 hover:from-orange-600 hover:to-red-700 disabled:opacity-80"
          >
            {isOpeningDashboard ? "Opening in 3 seconds..." : "Enter User Dashboard"}
          </Button>
        </div>

        <div className="rounded-3xl border border-orange-500/20 bg-slate-950/70 p-5">
          <Button
            onClick={() => setLocation("/login")}
            className="mt-4 w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-5 rounded-lg"
          >
            Login
          </Button>
        </div>

        <p className="pt-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
          Together, We Respond. Together, We Save Lives.
        </p>
      </div>
    </div>
  );
}
