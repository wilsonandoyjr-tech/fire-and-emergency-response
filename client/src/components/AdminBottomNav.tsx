import { BarChart3, Contact, FileText, Map, User } from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";

const navItems = [
  { icon: BarChart3, label: "Dashboard", path: "/admin/dashboard" },
  { icon: FileText, label: "Reports", path: "/admin/reports" },
  { icon: Map, label: "Live Maps", path: "/admin/map" },
  { icon: Contact, label: "Key Contact", path: "/admin/key-contacts" },
  { icon: User, label: "Profile", path: "/admin/profile" },
];

export function AdminBottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-white/10 bg-[#081120]/95 px-2 py-2 backdrop-blur">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          location === item.path ||
          (item.path === "/admin/reports" && location.startsWith("/admin/incidents")) ||
          (item.path === "/admin/map" && location === "/admin/teams") ||
          (item.path === "/admin/key-contacts" && location === "/admin/deploy");

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

function AdminDesktopShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] bg-[#050913]">
        <aside className="hidden w-72 flex-col border-r border-slate-800 bg-slate-900 p-4 lg:flex">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Admin Console</p>
              <h1 className="text-2xl font-bold text-white">Fire Alert</h1>
            </div>
          </div>

          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location === item.path ||
                (item.path === "/admin/reports" && location.startsWith("/admin/incidents")) ||
                (item.path === "/admin/map" && location === "/admin/teams") ||
                (item.path === "/admin/key-contacts" && location === "/admin/deploy");

              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active ? "bg-orange-500/15 text-orange-300" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto rounded-3xl border border-white/10 bg-slate-800 p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Need quick access?</p>
            <p className="mt-2 text-sm text-slate-400">Keyboard shortcut: Ctrl+B to toggle sidebar</p>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminMobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#050913] pb-24 shadow-2xl shadow-black/40">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return isMobile ? <AdminMobileShell>{children}</AdminMobileShell> : <AdminDesktopShell>{children}</AdminDesktopShell>;
}
