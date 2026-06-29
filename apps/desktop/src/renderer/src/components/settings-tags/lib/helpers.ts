import { relativeTimeFromMs } from "@/lib/util/relative-time";

export type SortDir = "asc" | "desc";
export type SortKey = "name" | "usage" | "recent";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

// Each key lands on the direction people actually want first: names read A→Z,
// but usage and recency are most useful biggest/newest-first.
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  usage: "desc",
  recent: "desc",
};

// Named swatches a user can assign to a group. Values are theme tokens so they
// adapt to light/dark automatically.
export const GROUP_COLORS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Red", value: "var(--ds-red-9)" },
  { label: "Orange", value: "var(--ds-orange-9)" },
  { label: "Amber", value: "var(--ds-amber-9)" },
  { label: "Green", value: "var(--ds-green-9)" },
  { label: "Teal", value: "var(--ds-teal-9)" },
  { label: "Blue", value: "var(--ds-blue-9)" },
  { label: "Violet", value: "var(--ds-violet-9)" },
  { label: "Pink", value: "var(--ds-pink-9)" },
];

// Deterministic dot color hashed from a label name. Tags don't store a color;
// the hash gives every tag a stable, distinct dot for free.
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1)
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 55%)`;
}

// Stable callback ref that focuses (and selects) an input on mount — used for
// inline create/rename so we get autofocus behaviour without the lint.
export function focusInput(el: HTMLInputElement | null): void {
  if (!el) return;
  el.focus();
  el.select();
}

export function relativeTime(ms: number | null): string {
  return relativeTimeFromMs(ms, "—");
}

export function cmpName(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? r : -r;
}

// A single row's comparable values for the active sort key. `recent` uses
// -Infinity for "never used" so those always sink to the bottom on desc.
export interface SortFacets {
  name: string;
  usage: number;
  recent: number;
}

export function compareFacets(
  a: SortFacets,
  b: SortFacets,
  sort: SortState,
): number {
  if (sort.key === "name") return cmpName(a.name, b.name, sort.dir);
  const delta = sort.key === "usage" ? a.usage - b.usage : a.recent - b.recent;
  // Stable, readable tiebreak so equal counts/dates don't shuffle on re-render.
  if (delta !== 0) return sort.dir === "asc" ? delta : -delta;
  return cmpName(a.name, b.name, "asc");
}
