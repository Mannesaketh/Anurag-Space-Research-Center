import type { ProfileData, Update } from "../types/workspace";
import { domainNames } from "../constants/workspaceData";
import { backendEnabled } from "../api";

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  },
) {
  if (!iso) return "TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function initials(profile: ProfileData) {
  const first = profile.firstName?.[0] || "";
  const last = profile.lastName?.[0] || "";
  return (first + last).toUpperCase() || "AS";
}

export function normalizeUpdateBranding(update: Update): Update {
  const category =
    update.category === "Symposium" || update.category === "Competition"
      ? "Hackathon"
      : update.category === "Design Review" || update.category === "Workshop"
        ? "Event"
        : update.category === "Research Paper"
          ? "News"
          : update.category;

  const validDomain = ["All domains", ...domainNames].includes(update.domain)
    ? update.domain
    : "All domains";

  return {
    ...update,
    category,
    domain: validDomain,
  };
}

export function downloadEvent(update: Update) {
  if (!update.date) return;
  const timestamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const fold = (str: string) => (str.length > 75 ? str.match(/.{1,75}/g).join("\r\n ") : str);
  const escapeStr = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anurag Space Research Center//Research Workspace Preview//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + escapeStr(update.id) + "@anurag-space-research-center-preview",
    "DTSTAMP:" + timestamp(new Date()),
    "DTSTART:" + timestamp(new Date(update.date)),
    "SUMMARY:" + escapeStr(backendEnabled ? update.title : "[" + (update.id.startsWith("sample") ? "Sample" : "Preview") + "] " + update.title),
    "DESCRIPTION:" + escapeStr(backendEnabled ? update.body : update.body + "\n\nAnurag Space Research Center preview content  -  not a confirmed university event."),
    "LOCATION:" + escapeStr(update.location),
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";

  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "anurag-space-research-center-" + update.id.replace(/[^a-zA-Z0-9-]/g, "") + ".ics";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function money(num: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}
