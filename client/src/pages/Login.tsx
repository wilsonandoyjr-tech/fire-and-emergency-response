import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, ArrowLeft, Mail, Lock } from "lucide-react";
import { getApiUrl } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type LoginRole = "admin" | "fire" | "medical" | "pulis" | "user";

function normalizeLoginRole(role?: string): LoginRole {
  const normalizedRole = String(role ?? "user").trim().toLowerCase();
  if (normalizedRole === "police") return "pulis";
  if (normalizedRole === "admin" || normalizedRole === "fire" || normalizedRole === "medical" || normalizedRole === "pulis") {
    return normalizedRole;
  }
  return "user";
}

const dashboardByRole: Record<LoginRole, string> = {
  admin: "/admin/dashboard",
  fire: "/fire/dashboard",
  medical: "/medical/dashboard",
  pulis: "/police/dashboard",
  user: "/user/home",
};

const roleLabels: Record<LoginRole, string> = {
  admin: "Admin",
  fire: "Fire",
  medical: "Medical",
  pulis: "Police",
  user: "User",
};

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = getApiUrl(`/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      const res = await fetch(url, { credentials: "include" });


      let data: any = null;
      try {
        // Backend might return non-JSON on proxy/CORS/network errors
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = data?.message || `Login failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      const role = normalizeLoginRole(data.user.role);
      const loggedInUser = {
        ...data.user,
        role,
      };
      const dashboardPath = dashboardByRole[role] ?? "/user/home";

      localStorage.setItem("user", JSON.stringify(loggedInUser));
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(loggedInUser));

      toast.success("Login successful", {
        description: `${loggedInUser.name || "Account"} signed in as ${roleLabels[role] ?? "User"}.`,
      });
      setLocation(dashboardPath, { replace: true });
      utils.auth.me.setData(undefined, loggedInUser);
    } catch (error: any) {
      console.error("Login error:", error);
      const message =
        error instanceof TypeError
          ? "Cannot reach the backend. Start the server with npm run dev in the server folder."
          : error?.message || "Login failed. Please check your credentials and try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
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

      <div className="flex-1 px-4 py-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Responder & Admin Login</h1>
          <p className="text-gray-400">Sign in to access the role-based control dashboards for incident response.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-300">
              <input type="checkbox" className="rounded" />
              Remember me
            </label>
            <button type="button" className="text-orange-400 hover:text-orange-300">
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-6 rounded-lg mt-6"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-400 mb-6">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setLocation("/signup")}
            className="font-semibold text-orange-400 hover:text-orange-300"
          >
            Create account
          </button>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-gray-500 text-sm">Or continue with</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-3 transition-colors">
            <span className="text-2xl">G</span>
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-3 transition-colors">
            <span className="text-2xl">f</span>
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-3 transition-colors">
            <span className="text-2xl">A</span>
          </button>
        </div>

        </div>
    </div>
  );
}
