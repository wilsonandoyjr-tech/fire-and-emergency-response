import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { getSocketUrl } from "@/const";
import {
  CheckCircle2,
  Clock3,
  Shield,
  History,
  Loader2,
  MapPin,
  Plus,
  Radio,
  Trash2,
  Truck,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponderProfilePanel } from "@/components/ResponderProfilePanel";
import { alertResponderNewReport, playResponderAlarmTone } from "@/lib/responderAlert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type PulisModule = "reports" | "teams" | "history" | "deploy" | "profile";

const pulisTeamSubtypes = ["Police Officer", "Investigator"] as const;

const moduleItems = [
  { id: "reports", label: "Reports", icon: Shield },
  { id: "teams", label: "Team Management", icon: Users },
  { id: "history", label: "History", icon: History },
  { id: "deploy", label: "Deploy", icon: Radio },
  { id: "profile", label: "Profile", icon: User },
] as const;

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  team_dispatched: "Dispatched",
  en_route: "En Route",
  resolved: "Resolved",
  archived_fake: "Archived / Fake",
};

const statusColor: Record<string, string> = {
  submitted: "bg-sky-500/15 text-sky-300",
  verified: "bg-cyan-500/15 text-cyan-300",
  assigned: "bg-violet-500/15 text-violet-300",
  team_dispatched: "bg-blue-500/15 text-blue-300",
  en_route: "bg-amber-500/15 text-amber-300",
  resolved: "bg-blue-500/15 text-blue-300",
  archived_fake: "bg-slate-500/15 text-slate-300",
};

const nextStatus = {
  assigned: "team_dispatched",
  team_dispatched: "en_route",
  en_route: "resolved",
} as const;

function isPoliceIncident(incident: { type?: string }) {
  const type = String(incident.type ?? "").toLowerCase();
  return type === "pulis" || type === "police";
}

export default function PulisDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeModule, setActiveModule] = useState<PulisModule>("reports");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamForm, setTeamForm] = useState<{
    name: string;
    leaderName: string;
    contact: string;
    vehicle: string;
    description: string;
    subtype: "Police Officer" | "Investigator";
  }>({
    name: "",
    leaderName: "",
    contact: "",
    vehicle: "",
    description: "",
    subtype: "Police Officer",
  });
  const [memberForm, setMemberForm] = useState({ name: "", role: "Team Leader" });

  const utils = trpc.useUtils();
  const { data: incidents } = trpc.incidents.list.useQuery({ limit: 100 });
  const { data: teams } = trpc.teams.list.useQuery({ limit: 100 });
  const { data: members } = trpc.teams.members.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: Boolean(selectedTeamId) },
  );

  const updateStatus = trpc.incidents.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.incidents.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "Failed to update incident"),
  });
  const assignTeam = trpc.deployments.assignTeam.useMutation({
    onSuccess: async ({ team }) => {
      toast.success(`${team.name} assigned automatically`);
      await Promise.all([utils.incidents.list.invalidate(), utils.teams.list.invalidate(), utils.deployments.list.invalidate()]);
    },
    onError: (error) => toast.error(error.message || "Failed to assign Police team"),
  });
  const createTeam = trpc.teams.create.useMutation();
  const updateTeam = trpc.teams.update.useMutation();
  const deleteTeam = trpc.teams.delete.useMutation({
    onSuccess: async () => {
      toast.success("Police team deleted");
      setSelectedTeamId(null);
      await Promise.all([utils.teams.list.invalidate(), utils.teams.members.invalidate()]);
    },
  });
  const addMember = trpc.teams.addMember.useMutation({
    onSuccess: async () => {
      setMemberForm({ name: "", role: "Team Leader" });
      await Promise.all([utils.teams.members.invalidate(), utils.teams.list.invalidate()]);
    },
    onError: (error) => toast.error(error.message || "Failed to add member"),
  });
  const deleteMember = trpc.teams.deleteMember.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.teams.members.invalidate(), utils.teams.list.invalidate()]);
    },
  });
  const deleteIncident = trpc.incidents.delete.useMutation({
    onSuccess: async () => {
      toast.success("History report deleted");
      await utils.incidents.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "Failed to delete report"),
  });
  const updateTeamStatus = trpc.teams.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.teams.list.invalidate();
    },
  });

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const refreshResponseData = () => {
      void utils.incidents.list.invalidate();
      void utils.teams.list.invalidate();
      void utils.deployments.list.invalidate();
    };

    const handleIncidentCreated = (incident: unknown) => {
      alertResponderNewReport("pulis", "Police", incident ?? {});
      refreshResponseData();
    };

    socket.on("incident:created", handleIncidentCreated);
    socket.on("incident:updated", refreshResponseData);
    socket.on("incident:deleted", refreshResponseData);
    socket.on("deployment:created", refreshResponseData);

    return () => {
      socket.off("incident:created", handleIncidentCreated);
      socket.off("incident:updated", refreshResponseData);
      socket.off("incident:deleted", refreshResponseData);
      socket.off("deployment:created", refreshResponseData);
      socket.disconnect();
    };
  }, [utils]);

  const PulisIncidents = useMemo(() => (incidents ?? []).filter(isPoliceIncident), [incidents]);
  const activePulisReports = PulisIncidents.filter((incident) => !["resolved", "archived_fake"].includes(incident.status));
  const pendingPulisReports = PulisIncidents.filter((incident) => incident.status === "submitted");
  const deployPulisReports = PulisIncidents.filter((incident) => ["verified", "assigned", "team_dispatched", "en_route"].includes(incident.status));
  const historyPulisReports = PulisIncidents.filter((incident) => ["resolved", "archived_fake"].includes(incident.status));
  const PulisTeams = useMemo(() => (teams ?? []).filter((team) => team.type === "pulis"), [teams]);
  const selectedTeam = PulisTeams.find((team) => team.id === selectedTeamId);
  const selectedMembers = selectedTeam?.id === selectedTeamId ? (members ?? []) : [];
  const availablePulisTeam = PulisTeams.find((team) => team.status === "available");

  useEffect(() => {
    if (pendingPulisReports.length === 0) return;

    playResponderAlarmTone();
    const alarmTimer = window.setInterval(playResponderAlarmTone, 5000);
    return () => window.clearInterval(alarmTimer);
  }, [pendingPulisReports.length]);

  const handleLogout = async () => {
    await logout();
    setLocation("/welcome");
  };

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teamForm.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    const team = await createTeam.mutateAsync({
      name: teamForm.name.trim(),
      description: teamForm.description.trim() || "Police team",
      type: "pulis",
      contact: teamForm.contact.trim() || "911",
      vehicle: teamForm.vehicle.trim() || "Pending vehicle",
      leaderId: 1,
    });

    if (teamForm.leaderName.trim()) {
      await addMember.mutateAsync({
        teamId: team.id,
        name: teamForm.leaderName.trim(),
        role: "Team Leader",
      });
    }

    toast.success("Police team created");
    setSelectedTeamId(team.id);
    setTeamForm({ name: "", leaderName: "", contact: "", vehicle: "", description: "", subtype: "Police Officer" });
    await utils.teams.list.invalidate();
  };

  const handleUpdateSelectedTeam = async () => {
    if (!selectedTeam) return;
    await updateTeam.mutateAsync({
      teamId: selectedTeam.id,
      name: teamForm.name.trim() || selectedTeam.name,
      description: teamForm.description.trim() || selectedTeam.description || "Police team",
      type: "pulis",
      contact: teamForm.contact.trim() || selectedTeam.contact,
      vehicle: teamForm.vehicle.trim() || selectedTeam.vehicle,
    });
    toast.success("Police team updated");
    setTeamForm({ name: "", leaderName: "", contact: "", vehicle: "", description: "", subtype: "Police Officer" });
    await utils.teams.list.invalidate();
  };

  const handleVerifyPoliceReport = async (incident: (typeof PulisIncidents)[number]) => {
    await updateStatus.mutateAsync({ incidentId: incident.id, status: "verified" });

    const matchingTeam = PulisTeams.find((team) => team.status === "available");
    if (matchingTeam) {
      await assignTeam.mutateAsync({ incidentId: incident.id, teamId: matchingTeam.id });
    } else {
      toast.success("Police report verified and moved to Deploy");
    }

    setActiveModule("deploy");
  };

  const handleMarkPoliceReportFake = async (incident: (typeof PulisIncidents)[number]) => {
    await updateStatus.mutateAsync({ incidentId: incident.id, status: "archived_fake" });
    toast.success("Police report marked fake and moved to History");
    setActiveModule("history");
  };

  const handleAutoAssign = async (incident: (typeof PulisIncidents)[number]) => {
    if (incident.status !== "verified") {
      toast.error("Verify the police report before deployment");
      return;
    }

    const matchingTeam = PulisTeams.find((team) => team.status === "available");

    if (!matchingTeam) {
      toast.error("No available police team found");
      return;
    }

    await assignTeam.mutateAsync({ incidentId: incident.id, teamId: matchingTeam.id });
  };

  const handleNextStatus = async (incident: (typeof PulisIncidents)[number]) => {
    const next = nextStatus[incident.status as keyof typeof nextStatus];
    if (!next) return;
    await updateStatus.mutateAsync({ incidentId: incident.id, status: next });
    toast.success(`Incident marked ${statusLabels[next]}`);
  };

  const handleDeleteDeployReport = async (incident: (typeof PulisIncidents)[number]) => {
    await updateStatus.mutateAsync({ incidentId: incident.id, status: "archived_fake" });
    await deleteIncident.mutateAsync({ incidentId: incident.id });
  };

  return (
    <div className="min-h-screen bg-[#050913] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-72 flex-col border-r border-blue-500/15 bg-slate-950 p-4 lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/20 text-blue-300">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Police Response</p>
              <h1 className="text-xl font-bold">Police Dashboard</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {moduleItems.map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active ? "bg-blue-500/15 text-blue-300" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-slate-900 p-4">
            <p className="font-semibold">{user?.name || "Police Officer"}</p>
            <p className="text-sm capitalize text-slate-400">{user?.role || "pulis"} role</p>
            <Button onClick={handleLogout} className="mt-4 w-full bg-slate-800 text-white hover:bg-slate-700">
              Sign Out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-blue-300">Police Alert Management</p>
                <h2 className="text-2xl font-bold">Police Dashboard</h2>
              </div>
              <Button onClick={() => setActiveModule("deploy")} className="bg-blue-600 text-white hover:bg-blue-700">
                <Radio className="mr-2 h-4 w-4" />
                Deploy
              </Button>
            </div>
          </header>

          <div className="space-y-5 p-4 lg:p-6">
            <section className="grid gap-3 md:grid-cols-4">
              <Stat label="Police Reports" value={PulisIncidents.length} icon={Shield} />
              <Stat label="Active" value={activePulisReports.length} icon={Clock3} />
              <Stat label="Police Teams" value={PulisTeams.length} icon={Truck} />
              <Stat label="History" value={historyPulisReports.length} icon={CheckCircle2} />
            </section>

            {activeModule === "reports" && (
              <ReportsModule
                reports={pendingPulisReports}
                onView={(id) => setLocation(`/pulis/incidents/${id}/review`)}
                onVerify={handleVerifyPoliceReport}
                onArchive={handleMarkPoliceReportFake}
                busy={assignTeam.isPending || updateStatus.isPending}
              />
            )}

            {activeModule === "teams" && (
              <TeamsModule
                teamForm={teamForm}
                setTeamForm={setTeamForm}
                onCreateTeam={handleCreateTeam}
                onUpdateTeam={handleUpdateSelectedTeam}
                teams={PulisTeams}
                selectedTeam={selectedTeam}
                selectedMembers={selectedMembers}
                selectedTeamId={selectedTeamId}
                setSelectedTeamId={setSelectedTeamId}
                memberForm={memberForm}
                setMemberForm={setMemberForm}
                onAddMember={() => {
                  if (!selectedTeam || !memberForm.name || !memberForm.role) return;
                  addMember.mutate({ teamId: selectedTeam.id, name: memberForm.name, role: memberForm.role });
                }}
                onDeleteMember={(memberId) => deleteMember.mutate({ memberId })}
                onDeleteTeam={(teamId) => deleteTeam.mutate({ teamId })}
                onStatus={(teamId, status) => updateTeamStatus.mutate({ teamId, status })}
              />
            )}

            {activeModule === "history" && (
              <HistoryModule
                reports={historyPulisReports}
                onView={(id) => setLocation(`/pulis/incidents/${id}/review`)}
                onDelete={(id) => deleteIncident.mutate({ incidentId: id })}
                deleting={deleteIncident.isPending}
              />
            )}

            {activeModule === "deploy" && (
              <DeployModule
                reports={deployPulisReports}
                availableTeam={availablePulisTeam}
                onAutoAssign={handleAutoAssign}
                onNextStatus={handleNextStatus}
                onDelete={handleDeleteDeployReport}
                onView={(id) => setLocation(`/pulis/incidents/${id}/review`)}
                busy={assignTeam.isPending || updateStatus.isPending}
                deleting={deleteIncident.isPending}
              />
            )}

            {activeModule === "profile" && <ResponderProfilePanel theme="pulis" />}
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 gap-1 border-t border-white/10 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
            {moduleItems.map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-semibold leading-tight transition ${
                    active ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="mb-1 h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-blue-500/15 p-3">
          <Icon className="h-6 w-6 text-blue-300" />
        </div>
      </div>
    </Card>
  );
}

function ReportsModule({
  reports,
  onView,
  onVerify,
  onArchive,
  busy,
}: {
  reports: any[];
  onView: (id: number) => void;
  onVerify: (incident: any) => void;
  onArchive: (incident: any) => void;
  busy: boolean;
}) {
  return (
    <section className="space-y-3">
      <ModuleHeader title="Police Reports" detail="Manage user-submitted Police incident reports." />
      {reports.length > 0 ? (
        reports.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} onView={onView}>
            {incident.status === "submitted" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => onVerify(incident)} disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Police report
                </Button>
                <Button onClick={() => onArchive(incident)} disabled={busy} className="bg-slate-700 text-white hover:bg-slate-600">
                  Mark Fake
                </Button>
              </div>
            )}
          </IncidentCard>
        ))
      ) : (
        <EmptyState text="No active Police reports." />
      )}
    </section>
  );
}

function TeamsModule(props: {
  teamForm: { name: string; leaderName: string; contact: string; vehicle: string; description: string; subtype: "Police Officer" | "Investigator" };
  setTeamForm: React.Dispatch<React.SetStateAction<{ name: string; leaderName: string; contact: string; vehicle: string; description: string; subtype: "Police Officer" | "Investigator" }>>;
  onCreateTeam: (event: React.FormEvent) => void;
  onUpdateTeam: () => void;
  teams: any[];
  selectedTeam?: any;
  selectedMembers: any[];
  selectedTeamId: number | null;
  setSelectedTeamId: (id: number) => void;
  memberForm: { name: string; role: string };
  setMemberForm: React.Dispatch<React.SetStateAction<{ name: string; role: string }>>;
  onAddMember: () => void;
  onDeleteMember: (memberId: number) => void;
  onDeleteTeam: (teamId: number) => void;
  onStatus: (teamId: number, status: "available" | "on_duty" | "active") => void;
}) {
  const { teamForm, setTeamForm } = props;
  const [creating, setCreating] = useState(false);
  const roleGroup = (role: string) => role.toLowerCase().includes("lead") ? "leader" : role.toLowerCase().includes("driver") ? "driver" : "assistant";
  const leader = props.selectedMembers.find((member) => roleGroup(member.role) === "leader");
  const driver = props.selectedMembers.find((member) => roleGroup(member.role) === "driver");
  const assistants = props.selectedMembers.filter((member) => roleGroup(member.role) === "assistant");
  const orderedMembers = [leader, driver, ...assistants].filter(Boolean);
  const showingManager = creating || Boolean(props.selectedTeam);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModuleHeader title="Team Management" detail="Teams are limited to 1 leader, 1 driver, and 3 assistants." />
        <Button
          type="button"
          onClick={() => {
            setCreating(true);
            props.setSelectedTeamId(0);
          }}
          className="h-9 bg-blue-600 px-3 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {props.teams.map((team) => (
          <Card key={team.id} className="rounded-2xl border-white/10 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{team.name}</h3>
                <p className="text-sm text-slate-400">{team.description}</p>
                <p className="mt-2 text-xs text-slate-500">{team.memberCount}/5 members - {team.vehicle}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300">{team.status.replace("_", " ")}</span>
                <Button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    props.setSelectedTeamId(team.id);
                  }}
                  className="h-8 bg-slate-800 px-3 text-xs text-white hover:bg-slate-700"
                >
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showingManager && (
        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          {creating && (
            <Card className="rounded-2xl border-white/10 bg-slate-900 p-4">
              <h3 className="mb-3 font-semibold">Create Police Team</h3>
          <form onSubmit={props.onCreateTeam} className="grid gap-3">
            <Input placeholder="Team name" value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            <Input placeholder="Leader name" value={teamForm.leaderName} onChange={(event) => setTeamForm({ ...teamForm, leaderName: event.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            <Input placeholder="Contact number" value={teamForm.contact} onChange={(event) => setTeamForm({ ...teamForm, contact: event.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            <Input placeholder="Vehicle" value={teamForm.vehicle} onChange={(event) => setTeamForm({ ...teamForm, vehicle: event.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            <textarea
              placeholder="Description"
              value={teamForm.description}
              onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })}
              className="min-h-24 rounded-lg border border-slate-700 bg-slate-800 p-3 text-white outline-none"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
              <Button type="button" onClick={() => setCreating(false)} className="bg-slate-700 text-white hover:bg-slate-600">
                Cancel
              </Button>
            </div>
          </form>
            </Card>
          )}

          <Card className="rounded-2xl border-white/10 bg-slate-900 p-4">
        {props.selectedTeam ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">{props.selectedTeam.name}</h3>
                <p className="text-sm text-slate-400">Leader: {leader?.name ?? "No leader member yet"}</p>
                <p className="text-sm text-slate-400">Driver: {driver?.name ?? "No driver yet"}</p>
                <p className="text-sm text-slate-400">Assistants: {assistants.length}/3</p>
                <p className="text-sm text-slate-400">Contact: {props.selectedTeam.contact}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => props.onDeleteTeam(props.selectedTeam.id)} className="bg-red-600 text-white hover:bg-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button onClick={() => props.setSelectedTeamId(0)} className="bg-slate-700 text-white hover:bg-slate-600">
                  Cancel
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["available", "on_duty", "active"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => props.onStatus(props.selectedTeam.id, status)}
                  className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize ${
                    props.selectedTeam.status === status ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <Input placeholder="Member name" value={props.memberForm.name} onChange={(event) => props.setMemberForm({ ...props.memberForm, name: event.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              <select value={props.memberForm.role} onChange={(event) => props.setMemberForm({ ...props.memberForm, role: event.target.value })} className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none">
                <option value="Team Leader">Leader</option>
                <option value="Driver">Driver</option>
                <option value="Assistant">Assistant</option>
              </select>
              <Button onClick={props.onAddMember} className="bg-blue-600 text-white hover:bg-blue-700">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>

            <div className="space-y-2">
              {orderedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.role}</p>
                  </div>
                  <button onClick={() => props.onDeleteMember(member.id)} className="text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState text="Choose Manage on a team, or create a new team." />
        )}
          </Card>
        </section>
      )}
    </section>
  );
}

function HistoryModule({
  reports,
  onView,
  onDelete,
  deleting,
}: {
  reports: any[];
  onView: (id: number) => void;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  return (
    <section className="space-y-3">
      <ModuleHeader title="History" detail="Resolved and fake police reports are stored here." />
      {reports.length > 0 ? (
        reports.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} onView={onView}>
            <Button onClick={() => onDelete(incident.id)} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Report
            </Button>
          </IncidentCard>
        ))
      ) : (
        <EmptyState text="No police history yet." />
      )}
    </section>
  );
}

function DeployModule({
  reports,
  availableTeam,
  onAutoAssign,
  onNextStatus,
  onDelete,
  onView,
  busy,
  deleting,
}: {
  reports: any[];
  availableTeam?: any;
  onAutoAssign: (incident: any) => void;
  onNextStatus: (incident: any) => void;
  onDelete: (incident: any) => void;
  onView: (id: number) => void;
  busy: boolean;
  deleting: boolean;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const deployable = reports.filter((incident) => ["verified", "assigned", "team_dispatched", "en_route"].includes(incident.status));

  return (
    <section className="space-y-3">
      <ModuleHeader title="Deploy" detail="Automatically assign the available Police team and mark response status." />
      <Card className="rounded-2xl border-blue-500/25 bg-blue-500/10 p-4">
        <p className="text-sm text-blue-100">Next available Police team: <strong>{availableTeam?.name ?? "None available"}</strong></p>
      </Card>
      {deployable.length > 0 ? (
        deployable.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} onView={onView}>
            <div className="grid gap-2 sm:grid-cols-2">
              {incident.status === "verified" ? (
                <Button onClick={() => onAutoAssign(incident)} disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                  Auto Assign Available Team
                </Button>
              ) : (
                <Button onClick={() => onNextStatus(incident)} disabled={busy || incident.status === "resolved"} className="bg-blue-600 text-white hover:bg-blue-700">
                  Mark {statusLabels[nextStatus[incident.status as keyof typeof nextStatus]] ?? "Complete"}
                </Button>
              )}
              {confirmDeleteId === incident.id ? (
                <>
                  <Button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={busy || deleting}
                    className="bg-slate-700 text-white hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => onDelete(incident)}
                    disabled={busy || deleting}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Hazard Report
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setConfirmDeleteId(incident.id)}
                  disabled={busy || deleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Report
                </Button>
              )}
            </div>
          </IncidentCard>
        ))
      ) : (
        <EmptyState text="No Police incidents ready for deployment." />
      )}
    </section>
  );
}

function IncidentCard({ incident, children, onView }: { incident: any; children?: React.ReactNode; onView: (id: number) => void }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-slate-900 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-500/15 p-3">
          <Shield className="h-5 w-5 text-blue-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold">{incident.title}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs uppercase ${statusColor[incident.status] ?? "bg-slate-500/15 text-slate-300"}`}>
              {statusLabels[incident.status] ?? incident.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{incident.address || "Location unknown"}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(incident.createdAt).toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs uppercase text-red-200">{incident.severity} priority</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">{incident.vehicle ?? "No vehicle assigned"}</span>
          </div>
          <div className="mt-4 grid gap-2">
            <Button onClick={() => onView(incident.id)} className="bg-slate-800 text-white hover:bg-slate-700">
              <MapPin className="mr-2 h-4 w-4" />
              View User Report Details
            </Button>
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ModuleHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-slate-900 p-8 text-center">
      <Shield className="mx-auto mb-3 h-10 w-10 text-slate-600" />
      <p className="text-slate-400">{text}</p>
    </Card>
  );
}
