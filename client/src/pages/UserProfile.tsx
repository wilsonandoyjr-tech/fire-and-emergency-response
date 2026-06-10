import { useEffect, useState } from "react";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMobileShell } from "@/components/UserBottomNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function UserProfile() {
  const { user, refresh } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  useEffect(() => {
    if (!user) return;

    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
  }, [user]);

  const handleSave = async () => {
    setIsSaved(false);

    const updatedUser = await updateProfileMutation.mutateAsync({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
    });

    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(updatedUser));
    await refresh();
    setIsSaved(true);
  };

  return (
    <UserMobileShell>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-5 py-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-orange-300">Account</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Profile</h1>
        <p className="mt-3 text-lg text-slate-400">Name, email, and contact information.</p>
      </header>

      <main className="space-y-8 px-5 py-5">
        <section className="rounded-[2rem] border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-red-950/30 to-black p-8 text-center shadow-2xl shadow-orange-950/20">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
            <User className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-8 text-3xl font-bold text-white">
            {formData.name || "Your name"}
          </h2>
          <p className="mt-5 text-lg text-slate-300">Valencia City resident</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">Edit Profile</h3>
          <Input
            value={formData.name}
            onChange={(event) => {
              setIsSaved(false);
              setFormData({ ...formData, name: event.target.value });
            }}
            className="h-14 rounded-2xl border-white/10 bg-[#0b1220] px-4 text-lg text-white placeholder:text-slate-600"
            placeholder="Full name"
          />
          <Input
            type="email"
            value={formData.email}
            onChange={(event) => {
              setIsSaved(false);
              setFormData({ ...formData, email: event.target.value });
            }}
            className="h-14 rounded-2xl border-white/10 bg-[#0b1220] px-4 text-lg text-white placeholder:text-slate-600"
            placeholder="user@example.com"
          />
          <Input
            value={formData.phone}
            onChange={(event) => {
              setIsSaved(false);
              setFormData({ ...formData, phone: event.target.value });
            }}
            className="h-14 rounded-2xl border-white/10 bg-[#0b1220] px-4 text-lg text-white placeholder:text-slate-600"
            placeholder="Phone number"
          />
          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="h-14 w-full rounded-2xl bg-orange-600 text-lg font-semibold text-white hover:bg-orange-700"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
          {isSaved && (
            <p className="text-center text-sm font-medium text-orange-300">
              Profile saved.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">Preferences</h3>
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#0b1220] p-5 text-left transition hover:border-orange-500/40"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-orange-500/15 p-4">
                <Bell className="h-6 w-6 text-orange-300" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Emergency Alerts</p>
                <p className="text-base text-slate-400">{alertsEnabled ? "ON" : "OFF"}</p>
              </div>
            </div>
            <span className={`h-8 w-14 rounded-full p-1 transition ${alertsEnabled ? "bg-orange-500" : "bg-slate-700"}`}>
              <span className={`block h-6 w-6 rounded-full bg-white transition ${alertsEnabled ? "translate-x-6" : ""}`} />
            </span>
          </button>
        </section>
      </main>
    </UserMobileShell>
  );
}
