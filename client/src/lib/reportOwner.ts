const REPORT_OWNER_KEY = "fire-alert-report-owner-id";

export function getReportOwnerId() {
  if (typeof window === "undefined") return undefined;

  const existing = Number(localStorage.getItem(REPORT_OWNER_KEY));
  if (Number.isInteger(existing)) return existing;

  const ownerId = -Math.floor(Date.now() + Math.random() * 1_000_000);
  localStorage.setItem(REPORT_OWNER_KEY, ownerId.toString());
  return ownerId;
}
