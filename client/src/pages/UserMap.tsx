import { useState } from "react";
import { Backpack, Building2, ChevronDown, CloudSun, Cross, Flame, Home, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserMobileShell } from "@/components/UserBottomNav";
import { trpc } from "@/lib/trpc";

const guides = [
  {
    icon: Home,
    title: "Home Safety Check",
    items: [
      "Install smoke detectors on every level",
      "Test detectors monthly",
      "Create escape routes from each room",
      "Keep fire extinguishers accessible",
      "Clear flammable materials from exits",
    ],
  },
  {
    icon: Backpack,
    title: "Emergency Kit List",
    items: [
      "Important documents and IDs",
      "Medications and medical supplies",
      "Water and non-perishable food",
      "Flashlight and batteries",
      "Change of clothes and sturdy shoes",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Family Evacuation Plan",
    items: [
      "Choose two meeting places",
      "Assign roles for adults and older children",
      "Practice the route every few months",
      "Keep contact numbers written down",
      "Plan for pets, seniors, and children",
    ],
  },
  {
    icon: Flame,
    title: "Fire Extinguisher Guide",
    items: [
      "Use PASS: Pull, Aim, Squeeze, Sweep",
      "Stand near a clear exit",
      "Use only for small contained fires",
      "Leave immediately if smoke thickens",
      "Replace or recharge after use",
    ],
  },
];

const localResources = [
  {
    icon: Flame,
    title: "Fire Station",
    detail: "Nearest unit 1.8 km",
    location: "Valencia Central Fire Station",
    badge: "Fire Assistance",
    color: "text-orange-300",
  },
  {
    icon: Cross,
    title: "Hospital",
    detail: "Nearest emergency hospital 2.3 km",
    location: "Valencia Emergency Hospital",
    badge: "Medical Assistance",
    color: "text-emerald-300",
  },
  {
    icon: Building2,
    title: "Evacuation Center",
    detail: "Nearest center 1.1 km",
    location: "Valencia City Sports Complex",
    badge: "Safe Shelter",
    color: "text-sky-300",
  },
  {
    icon: ShieldCheck,
    title: "Police Station",
    detail: "Nearest station 1.6 km",
    location: "Valencia Police Station",
    badge: "Police Assistance",
    color: "text-blue-300",
  },
];

export default function UserMap() {
  const [openGuide, setOpenGuide] = useState<string | null>("Home Safety Check");
  const { data: contacts } = trpc.emergencyContacts.list.useQuery();

  return (
    <UserMobileShell>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#081120]/95 px-4 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Preparedness guides</p>
        <h1 className="mt-1 text-2xl font-bold">Resources</h1>
        <p className="mt-1 text-sm text-slate-400">Learn, prepare, and find nearby support.</p>
      </header>

      <main className="space-y-5 p-4">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Map View</h2>
          <Card className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">View Live Map</p>
                <p className="text-sm text-slate-400">Open the interactive incident and resources map for faster guidance.</p>
              </div>
              <a
                href="/user/live-map"
                className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 hover:bg-orange-500/15"
              >
                <MapPin className="h-4 w-4" />
                Open Map
              </a>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Preparedness Guides</h2>
          {guides.map((guide) => {
            const Icon = guide.icon;
            const expanded = openGuide === guide.title;
            return (
              <Card
                key={guide.title}
                onClick={() => setOpenGuide(expanded ? null : guide.title)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  expanded ? "border-orange-400 bg-orange-500/10" : "border-white/10 bg-[#0b1220]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-orange-500/15 p-3">
                    <Icon className="h-5 w-5 text-orange-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">{guide.title}</h3>
                    <p className="text-sm text-slate-400">{guide.items.length} safety steps</p>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-slate-500 transition ${expanded ? "rotate-180 text-orange-300" : ""}`} />
                </div>
                {expanded && (
                  <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
                    {guide.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Nearest Resources</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {localResources.map((resource) => {
              const Icon = resource.icon;
              return (
                <Card key={resource.title} className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <Icon className={`h-5 w-5 ${resource.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{resource.title}</h3>
                          <p className="text-sm text-slate-400">{resource.location}</p>
                        </div>
                        <span className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                          {resource.badge}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{resource.detail}</p>
                    </div>
                  </div>
                  <a
                    href="/user/live-map"
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300 hover:bg-orange-500/15"
                  >
                    View on map
                  </a>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Key Contacts</h2>
          {(contacts ?? []).map((contact) => (
            <a
              key={contact.id}
              href={`tel:${contact.phone}`}
              className="flex min-h-14 items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-sm"
            >
              <span className="font-semibold text-white">{contact.name}</span>
              <span className="flex items-center gap-2 text-emerald-300">
                <Phone className="h-4 w-4" />
                {contact.phone}
              </span>
            </a>
          ))}
        </section>
      </main>
    </UserMobileShell>
  );
}
