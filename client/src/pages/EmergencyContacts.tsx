import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ambulance, Flame, Phone, MessageSquare, AlertTriangle, Shield } from "lucide-react";
import { UserMobileShell } from "@/components/UserBottomNav";
import { trpc } from "@/lib/trpc";

export default function EmergencyContacts() {
  const { data: contacts } = trpc.emergencyContacts.list.useQuery();

  const getContactIcon = (type: string) => {
    switch (type) {
      case "fire_department":
        return Flame;
      case "police":
        return Shield;
      case "ambulance":
        return Ambulance;
      default:
        return Phone;
    }
  };

  const getContactColor = (type: string) => {
    switch (type) {
      case "fire_department":
        return "border-red-500/50 bg-red-500/10";
      case "police":
        return "border-blue-500/50 bg-blue-500/10";
      case "ambulance":
        return "border-green-500/50 bg-green-500/10";
      default:
        return "border-orange-500/50 bg-orange-500/10";
    }
  };

  return (
    <UserMobileShell>
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="w-6"></div>
        <h1 className="text-xl font-bold text-white">Contact Emergency</h1>
        <div className="w-6"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Alert Banner */}
        <Card className="bg-red-500/10 border-red-500/50 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Emergency Numbers</p>
              <p className="text-gray-300 text-xs mt-1">Save these numbers for quick access during emergencies</p>
            </div>
          </div>
        </Card>

        {/* Contacts List */}
        <div className="space-y-3">
          {contacts && contacts.length > 0 ? (
            contacts.map((contact) => (
              <Card key={contact.id} className={`border-2 ${getContactColor(contact.type)} p-4`}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="rounded-2xl bg-black/20 p-3 flex-shrink-0">
                    {(() => {
                      const Icon = getContactIcon(contact.type);
                      return <Icon className="h-6 w-6 text-white" />;
                    })()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold">{contact.name}</h3>
                    <p className="text-gray-400 text-sm">{contact.description}</p>
                    <p className="text-orange-400 font-semibold text-lg mt-1">{contact.phone}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => (window.location.href = `tel:${contact.phone}`)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </Button>
                  {contact.email && (
                    <Button
                      onClick={() => (window.location.href = `sms:${contact.phone}`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <p className="text-gray-400">No emergency contacts available</p>
            </Card>
          )}
        </div>

        {/* Quick Tips */}
        <Card className="bg-slate-800 border-slate-700 p-4 mt-6">
          <h3 className="text-white font-semibold mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li>Keep emergency numbers saved in your phone</li>
            <li>Provide clear location details when calling</li>
            <li>Stay calm and follow dispatcher instructions</li>
            <li>Use SOS button for immediate emergency alert</li>
          </ul>
        </Card>
      </div>
    </UserMobileShell>
  );
}
