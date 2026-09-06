import type { Prefs } from "@pond/schema";

export type SyncSchedule = Prefs["sync"]["cron"];

export function isSyncScheduleDue(
  schedule: SyncSchedule,
  now: Date,
  lastRunAt: number,
  calendarSince: number,
): boolean {
  if (!schedule.enabled) return false;
  if (!schedule.calendar)
    return now.getTime() - lastRunAt >= schedule.intervalHours * 3_600_000;
  const { calendar } = schedule;
  const [hours = 0, minutes = 0] = calendar.time.split(":").map(Number);
  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() - offset);
    candidate.setHours(hours, minutes, 0, 0);
    if (
      calendar.kind === "weekly" &&
      !calendar.days.includes(candidate.getDay())
    )
      continue;
    const at = candidate.getTime();
    if (at <= now.getTime() && at > Math.max(lastRunAt, calendarSince))
      return true;
  }
  return false;
}

export function describeSyncSchedule(schedule: SyncSchedule): string {
  if (!schedule.enabled) return "Manual only";
  if (!schedule.calendar)
    return `Every ${schedule.intervalHours} ${schedule.intervalHours === 1 ? "hour" : "hours"}`;
  const { calendar } = schedule;
  if (calendar.kind === "daily") return `Daily at ${calendar.time}`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${calendar.days.map((day) => names[day]).join(", ")} at ${calendar.time}`;
}
