import { BarChart3, BookOpen, FileText, Map, Settings } from "lucide-react";
import { useLocation } from "wouter";

const navItems = [
  { icon: BarChart3, label: "Dashboard", path: "/user/home" },
  { icon: Map, label: "Live Map", path: "/user/live-map" },
  { icon: FileText, label: "My Reports", path: "/user/reports" },
  { icon: BookOpen, label: "Resources", path: "/user/resources" },
  { icon: Settings, label: "Profile", path: "/user/profile" },
];

export function UserBottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-white/10 bg-[#081120]/95 px-2 py-2 backdrop-blur">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          location === item.path ||
          (item.path === "/user/reports" && location.startsWith("/user/incidents")) ||
          (item.path === "/user/reports" && location === "/user/report") ||
          (item.path === "/user/live-map" && location === "/user/map");

        return (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 text-[11px] transition ${
              active ? "bg-orange-500/20 text-orange-300" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            <Icon className="mb-1 h-5 w-5" />
            <span className="leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function UserMobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#050913] pb-24 shadow-2xl shadow-black/40">
        {children}
      </div>
      <UserBottomNav />
    </div>
  );
}
