const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "never";
  const diff = Date.now() - ms;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < MONTH) return plural(Math.floor(diff / DAY), "day");
  if (diff < YEAR) return plural(Math.floor(diff / MONTH), "month");
  return plural(Math.floor(diff / YEAR), "year");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}
