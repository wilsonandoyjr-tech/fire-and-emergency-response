import { useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, BarChart3, Clock3, Flame, ShieldCheck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AdminShell } from "@/components/AdminBottomNav";

export default function AdminAnalysis() {
  const [, setLocation] = useLocation();
  const { data: incidents } = trpc.incidents.list.useQuery({ limit: 100 });

  const stats = useMemo(() => {
    const items = incidents ?? [];
    const resolved = items.filter((item) => item.status === "resolved").length;
    const fire = items.filter((item) => item.type === "fire").length;
    const medical = items.filter((item) => item.type === "medical").length;
    const successRate = items.length ? Math.round((resolved / items.length) * 100) : 0;

    return {
      total: items.length,
      fire,
      medical,
      resolved,
      successRate,
      responseTime: items.some((item) => ["assigned", "team_dispatched", "en_route", "resolved"].includes(item.status)) ? "8 min" : "Pending",
    };
  }, [incidents]);

  const chartRows = [
    { label: "Fire incidents", value: stats.fire, color: "bg-orange-500" },
    { label: "Medical incidents", value: stats.medical, color: "bg-sky-500" },
    { label: "Resolved incidents", value: stats.resolved, color: "bg-emerald-500" },
  ];
  const maxValue = Math.max(...chartRows.map((row) => row.value), 1);

  return (
    <AdminShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-4">
        <button onClick={() => setLocation("/admin/dashboard")} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Analysis</h1>
        <BarChart3 className="h-6 w-6 text-orange-400" />
      </header>

      <main className="space-y-5 p-4">
        <Card className="rounded-[2rem] border-orange-500/25 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.25),transparent_34%),linear-gradient(135deg,#0b1220,#050913)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Emergency analytics</p>
          <h2 className="mt-2 text-2xl font-bold">Incident performance overview</h2>
          <p className="mt-2 text-sm text-slate-400">Monthly reports, incident types, response time, success rate, and resolved incidents.</p>
        </Card>

        <section className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Monthly Reports", value: stats.total, icon: TrendingUp, color: "text-orange-300" },
            { label: "Response Time", value: stats.responseTime, icon: Clock3, color: "text-amber-300" },
            { label: "Success Rate", value: `${stats.successRate}%`, icon: ShieldCheck, color: "text-emerald-300" },
            { label: "Resolved", value: stats.resolved, icon: Flame, color: "text-sky-300" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-2xl border-slate-700 bg-slate-800 p-4">
                <Icon className={`h-6 w-6 ${item.color}`} />
                <p className="mt-3 text-sm text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{item.value}</p>
              </Card>
            );
          })}
        </section>

        <Card className="rounded-2xl border-slate-700 bg-slate-800 p-5">
          <h3 className="font-semibold text-white">Incident Types</h3>
          <div className="mt-4 space-y-4">
            {chartRows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{row.label}</span>
                  <span className="font-semibold text-white">{row.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-950">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max((row.value / maxValue) * 100, row.value ? 12 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </AdminShell>
  );
}
