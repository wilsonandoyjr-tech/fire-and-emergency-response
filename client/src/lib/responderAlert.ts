import { toast } from "sonner";

type ResponderType = "fire" | "medical" | "pulis";

type IncomingIncident = {
  id?: number;
  type?: string;
  title?: string;
  address?: string;
};

function matchesResponder(type: ResponderType, incidentType?: string) {
  const normalized = String(incidentType ?? "").toLowerCase();
  if (type === "pulis") return normalized === "pulis" || normalized === "police";
  return normalized === type;
}

export function playResponderAlarmTone() {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.35);
    gain.connect(context.destination);

    [0, 0.32, 0.64, 0.96].forEach((offset) => {
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, context.currentTime + offset);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.18);
    });

    window.setTimeout(() => void context.close(), 1600);
  } catch {
    // Some browsers block audio until the page has received a user gesture.
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission === "default") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
}

export function alertResponderNewReport(type: ResponderType, label: string, incident: IncomingIncident) {
  if (!matchesResponder(type, incident.type)) return;

  const title = `New ${label} report`;
  const body = incident.address || incident.title || "A new user report needs responder review.";

  toast.error(title, {
    description: body,
    duration: 9000,
  });
  showBrowserNotification(title, body);
  playResponderAlarmTone();
}
