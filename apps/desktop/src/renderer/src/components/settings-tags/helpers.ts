import { relativeTimeFromMs } from "@/lib/relative-time";

export type SortDir = "asc" | "desc";

// Deterministic dot color hashed from a label name (tags don't store their own).
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1)
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 55%)`;
}

export function relativeTime(ms: number | null): string {
  return relativeTimeFromMs(ms, "—");
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
