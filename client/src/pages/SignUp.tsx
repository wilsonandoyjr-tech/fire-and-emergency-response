import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, ArrowLeft, Mail, Lock, User, Shield, HeartPulse } from "lucide-react";
import { getApiUrl } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type AccountRole = "fire" | "medical" | "pulis" | "admin";

function normalizeAccountRole(role?: string): AccountRole {
  const normalizedRole = String(role ?? "fire").trim().toLowerCase();
  if (normalizedRole === "police") return "pulis";
  if (normalizedRole === "fire" || normalizedRole === "medical" || normalizedRole === "pulis" || normalizedRole === "admin") {
    return normalizedRole;
  }
  return "fire";
}

const roleLabels: Record<AccountRole, string> = {
  fire: "Fire",
  medical: "Medical",
  pulis: "Police",
  admin: "Admin",
};

const dashboardByRole: Record<AccountRole, string> = {
  admin: "/admin/dashboard",
  fire: "/fire/dashboard",
  medical: "/medical/dashboard",
  pulis: "/police/dashboard",
};

export default function SignUp() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [role, setRole] = useState<AccountRole>("fire");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(getApiUrl("/register"), {
        method: "POST",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          password: formData.password,
          role,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.message || `Failed to register (HTTP ${res.status})`);
      }

      if (!data?.user) {
        throw new Error("Account created, but login data was missing");
      }

      const userRole = normalizeAccountRole(data.user.role || role);
      const loggedInUser = {
        ...data.user,
        role: userRole,
      };

      localStorage.setItem("user", JSON.stringify(loggedInUser));
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(loggedInUser));
      utils.auth.me.setData(undefined, loggedInUser);

      toast.success("Account created and signed in", {
        description: `${loggedInUser.name || formData.name} is now signed in as ${roleLabels[userRole]}.`,
      });

      setLocation(dashboardByRole[userRole], { replace: true });
    } catch (error: any) {
      console.error("Signup error:", error);
      const message =
        error instanceof TypeError
          ? "Cannot reach the backend. Start the server with npm run dev in the server folder."
          : error?.message || "Failed to register";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6 flex items-center justify-between">
        <button
          onClick={() => setLocation("/welcome")}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-white font-semibold text-sm">Fire Alert</span>
        </div>
        <div className="w-6"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8 flex flex-col">
        {/* Account Details */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
          <p className="text-gray-400">Choose your response role and enter your account details</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4 flex-1">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("fire")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  role === "fire"
                    ? "border-orange-400 bg-orange-500/15"
                    : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                }`}
              >
                <Flame className="mb-3 h-5 w-5 text-orange-300" />
                <span className="block font-semibold text-white">Fire</span>
                <span className="mt-1 block text-xs text-gray-400">Fire response</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("medical")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  role === "medical"
                    ? "border-emerald-400 bg-emerald-500/15"
                    : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                }`}
              >
                <HeartPulse className="mb-3 h-5 w-5 text-emerald-300" />
                <span className="block font-semibold text-white">Medical</span>
                <span className="mt-1 block text-xs text-gray-400">Medical response</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("pulis")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  role === "pulis"
                    ? "border-sky-400 bg-sky-500/15"
                    : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                }`}
              >
                <Shield className="mb-3 h-5 w-5 text-sky-300" />
                <span className="block font-semibold text-white">Police</span>
                <span className="mt-1 block text-xs text-gray-400">Public safety</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  role === "admin"
                    ? "border-red-400 bg-red-500/15"
                    : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                }`}
              >
                <User className="mb-3 h-5 w-5 text-red-300" />
                <span className="block font-semibold text-white">Admin</span>
                <span className="mt-1 block text-xs text-gray-400">View Datails</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-gray-400 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1" required />
            <span>
              I agree to the{" "}
              <span className="text-orange-400 hover:text-orange-300">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-orange-400 hover:text-orange-300">
                Privacy Policy
              </span>
            </span>
          </label>

          {/* Sign Up Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-6 rounded-lg mt-6"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>

          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-slate-700"></div>
            <span className="text-sm text-gray-500">Or sign up with</span>
            <div className="h-px flex-1 bg-slate-700"></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["G", "f", "A"].map((provider) => (
              <button
                key={provider}
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-800 py-3 text-xl font-semibold text-white transition-colors hover:bg-slate-700"
              >
                {provider}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 text-center text-gray-400 text-sm">
        Already have an account?{" "}
        <button
          onClick={() => setLocation("/login")}
          className="text-orange-400 hover:text-orange-300 font-semibold"
        >
          Log in
        </button>
      </div>
    </div>
  );
}
