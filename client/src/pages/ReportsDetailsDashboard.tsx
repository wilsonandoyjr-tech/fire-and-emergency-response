import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Flame } from "lucide-react";

export default function ReportsDetailsDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: incidents } = trpc.incidents.list.useQuery({ limit: 200 });

  const myRole = user?.role;

  const grouped = useMemo(() => {
    const all = incidents ?? [];
    if (myRole === "admin") {
      return {
        all,
        fire: all.filter((i) => i.type === "fire"),
        medical: all.filter((i) => i.type === "medical"),
        pulis: all.filter((i) => i.type === "pulis"),
      };
    }

    // non-admins only see their role's incidents
    return {
      mine: all.filter((i) => i.type === myRole),
    } as any;
  }, [incidents, myRole]);

  const handleView = (incidentId: number, incidentType: string) => {
    if (myRole === "admin") {
      setLocation(`/admin/incidents/${incidentId}`);
      return;
    }

    if (myRole === "fire") setLocation(`/fire/incidents/${incidentId}`);
    else if (myRole === "medical") setLocation(`/medical/incidents/${incidentId}`);
    else if (myRole === "pulis") setLocation(`/pulis/incidents/${incidentId}`);
    else setLocation(`/user/incidents/${incidentId}`);
  };

  return (
    <div className="min-h-screen bg-[#050913] text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Report Details</h1>

      {myRole === "admin" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {(["fire", "medical", "pulis"] as const).map((type) => (
            <section key={type}>
              <h2 className="mb-2 text-lg font-semibold capitalize">{type} Reports</h2>
              {(grouped as any)[type].length === 0 ? (
                <Card className="p-4">No reports</Card>
              ) : (
                (grouped as any)[type].map((incident: any) => (
                  <Card key={incident.id} className="mb-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{incident.title}</p>
                        <p className="text-xs text-slate-400 truncate">{incident.address}</p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <Button onClick={() => handleView(incident.id, incident.type)} className="bg-orange-600 text-white">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </section>
          ))}
        </div>
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-semibold">My Role Reports</h2>
          {(grouped as any).mine?.length === 0 ? (
            <Card className="p-4">No reports for your role</Card>
          ) : (
            (grouped as any).mine.map((incident: any) => (
              <Card key={incident.id} className="mb-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{incident.title}</p>
                    <p className="text-xs text-slate-400 truncate">{incident.address}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <Button onClick={() => handleView(incident.id, incident.type)} className="bg-orange-600 text-white">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </section>
      )}
    </div>
  );
}
