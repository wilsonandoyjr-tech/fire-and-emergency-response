import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Theme = "fire" | "pulis" | "medical";

const themeClasses: Record<
  Theme,
  {
    accentText: string;
    border: string;
    panel: string;
    avatar: string;
    button: string;
    saved: string;
  }
> = {
  fire: {
    accentText: "text-orange-300",
    border: "border-orange-500/30",
    panel: "bg-gradient-to-br from-orange-500/15 via-red-950/30 to-black",
    avatar: "bg-gradient-to-br from-orange-500 to-red-600",
    button: "bg-orange-600 hover:bg-orange-700",
    saved: "text-orange-300",
  },
  pulis: {
    accentText: "text-blue-300",
    border: "border-blue-500/30",
    panel: "bg-gradient-to-br from-blue-500/15 via-slate-950 to-black",
    avatar: "bg-gradient-to-br from-blue-500 to-sky-700",
    button: "bg-blue-600 hover:bg-blue-700",
    saved: "text-blue-300",
  },
  medical: {
    accentText: "text-emerald-300",
    border: "border-emerald-500/30",
    panel: "bg-gradient-to-br from-emerald-500/15 via-slate-950 to-black",
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-700",
    button: "bg-emerald-600 hover:bg-emerald-700",
    saved: "text-emerald-300",
  },
};

export function ResponderProfilePanel({ theme }: { theme: Theme }) {
  const { user, refresh, logout } = useAuth();
  const [, setLocation] = useLocation();
  const classes = themeClasses[theme];
  const [isSaved, setIsSaved] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const handleChange = (field: keyof typeof formData, value: string) => {
    setIsSaved(false);
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    try {
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
      toast.success("Profile saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save profile");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // useAuth clears local auth state even if the backend is unavailable.
    } finally {
      setIsLoggingOut(false);
      setLocation("/login", { replace: true });
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${classes.accentText}`}>Account</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Profile</h2>
        <p className="mt-1 text-sm text-slate-400">Name, email, and contact information.</p>
      </div>

      <Card className={`rounded-2xl ${classes.border} ${classes.panel} p-6 text-center shadow-2xl shadow-black/20`}>
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${classes.avatar}`}>
          <User className="h-10 w-10 text-white" />
        </div>
        <h3 className="mt-6 text-2xl font-bold text-white">{formData.name || "Your name"}</h3>
        <p className="mt-2 text-sm capitalize text-slate-300">{user?.role || "responder"} account</p>
      </Card>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white">Edit Profile</h3>
        <Input
          value={formData.name}
          onChange={(event) => handleChange("name", event.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-[#0b1220] px-4 text-white placeholder:text-slate-600"
          placeholder="Full name"
        />
        <Input
          type="email"
          value={formData.email}
          onChange={(event) => handleChange("email", event.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-[#0b1220] px-4 text-white placeholder:text-slate-600"
          placeholder="user@example.com"
        />
        <Input
          value={formData.phone}
          onChange={(event) => handleChange("phone", event.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-[#0b1220] px-4 text-white placeholder:text-slate-600"
          placeholder="Phone number"
        />
        <Button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          className={`h-12 w-full rounded-2xl text-base font-semibold text-white ${classes.button}`}
        >
          {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
        {isSaved && <p className={`text-center text-sm font-medium ${classes.saved}`}>Profile saved.</p>}
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-bold text-white">Account Access</h3>
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="h-12 w-full rounded-2xl border border-red-500/30 bg-red-600/15 text-base font-semibold text-red-100 hover:bg-red-600/25"
        >
          <LogOut className="mr-2 h-5 w-5" />
          {isLoggingOut ? "Logging out..." : "Log Out"}
        </Button>
      </section>
    </section>
  );
}
