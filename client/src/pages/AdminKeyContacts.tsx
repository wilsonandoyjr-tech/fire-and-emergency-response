import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminShell } from "@/components/AdminBottomNav";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Ambulance, ArrowLeft, Flame, Phone, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminKeyContacts() {
  const [, setLocation] = useLocation();
  const { data: teams } = trpc.teams.list.useQuery({ limit: 100 });
  const responderTeams = ["fire", "medical", "pulis"]
    .map((type) => (teams ?? []).find((team) => team.type === type && team.status === "available"))
    .filter((team): team is NonNullable<typeof team> => Boolean(team));

  const getContactIcon = (type: string) => {
    switch (type) {
      case "fire":
        return Flame;
      case "pulis":
        return Shield;
      case "medical":
        return Ambulance;
      default:
        return Phone;
    }
  };

  const getContactColor = (type: string) => {
    switch (type) {
      case "fire":
        return "border-red-500/50 bg-red-500/10";
      case "pulis":
        return "border-blue-500/50 bg-blue-500/10";
      case "medical":
        return "border-emerald-500/50 bg-emerald-500/10";
      default:
        return "border-orange-500/50 bg-orange-500/10";
    }
  };

  const getContactLabel = (type: string) => {
    switch (type) {
      case "fire":
        return "Fire Responder";
      case "medical":
        return "Medical Responder";
      case "pulis":
        return "Police Responder";
      default:
        return "Responder";
    }
  };

  return (
    <AdminShell>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={() => setLocation("/admin/dashboard")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">Key Contact</h1>
          <Phone className="h-5 w-5 text-orange-400" />
        </div>
      </div>

      <main className="space-y-5 p-4">
        <Card className="rounded-[2rem] border-orange-500/25 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.24),transparent_34%),linear-gradient(135deg,#0b1220,#050913)] p-5 shadow-2xl shadow-orange-950/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0 text-orange-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Emergency directory</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Key response contacts</h2>
              <p className="mt-2 text-sm text-slate-300">Use one number for each response type from available responder teams.</p>
            </div>
          </div>
        </Card>

        <section className="grid gap-3 lg:grid-cols-2">
          {responderTeams.length > 0 ? (
            responderTeams.map((team) => {
              const Icon = getContactIcon(team.type);
              return (
                <Card key={team.id} className={`border-2 ${getContactColor(team.type)} p-4`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 rounded-2xl bg-black/20 p-3">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white">{getContactLabel(team.type)}</h3>
                      <p className="text-sm text-slate-400">{team.name} - available team</p>
                      <p className="mt-1 text-lg font-semibold text-orange-400">{team.contact}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => (window.location.href = `tel:${team.contact}`)}
                      className="flex-1 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="border-slate-700 bg-slate-800 p-6 text-center">
              <p className="text-slate-400">No available responder team contacts</p>
            </Card>
          )}
        </section>
      </main>
    </AdminShell>
  );
}
