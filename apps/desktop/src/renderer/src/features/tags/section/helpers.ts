export type SortDir = "asc" | "desc";

// Deterministic dot color hashed from a label name (tags don't store their own).
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1)
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 55%)`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function relativeTime(ms: number | null): string {
  if (ms == null) return "—";
  const diff = Date.now() - ms;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < MONTH) return plural(Math.floor(diff / DAY), "day");
  if (diff < YEAR) return plural(Math.floor(diff / MONTH), "month");
  return plural(Math.floor(diff / YEAR), "year");
}

export function formatCreated(ms: number | null): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function cmpName(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b);
  return dir === "asc" ? r : -r;
}
