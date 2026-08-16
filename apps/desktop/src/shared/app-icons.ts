import { DEFAULT_APP_ICON } from "@pond/schema/db";

export { DEFAULT_APP_ICON };

/** Preferred picker order: default first, then the saturated crayons, then the rest. */
const APP_ICON_ORDER = [
  DEFAULT_APP_ICON,
  "maraschino",
  "tangerine",
  "lemon",
  "lime",
  "spring",
  "sea-foam",
  "turquoise",
  "blueberry",
  "grape",
  "magenta",
  "strawberry",
  "mocha",
  "asparagus",
  "fern",
  "clover",
  "moss",
  "teal",
  "plum",
  "blue",
] as const;

export function appIconLabel(id: string): string {
  return id
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function resolveAppIconId(
  raw: unknown,
  available: ReadonlySet<string>,
): string {
  if (typeof raw === "string" && available.has(raw)) return raw;
  if (available.has(DEFAULT_APP_ICON)) return DEFAULT_APP_ICON;
  const first = available.values().next().value;
  return typeof first === "string" ? first : DEFAULT_APP_ICON;
}

export function sortAppIconIds(ids: Iterable<string>): string[] {
  const leftover = new Set(ids);
  const ordered: string[] = [];
  for (const id of APP_ICON_ORDER) {
    if (!leftover.has(id)) continue;
    leftover.delete(id);
    ordered.push(id);
  }
  return [...ordered, ...[...leftover].sort()];
}
