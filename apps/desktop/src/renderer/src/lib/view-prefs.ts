export type ViewPrefKey = "view" | "sort" | "dir" | "inspector" | "sidebar";

const STORAGE_KEYS: Record<ViewPrefKey, string> = {
  view: "pond.view",
  sort: "pond.sort",
  dir: "pond.dir",
  inspector: "pond.inspector",
  sidebar: "pond.sidebar",
};

export function readViewPref(key: ViewPrefKey): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEYS[key]);
  } catch {
    return null;
  }
}

export function writeViewPref(key: ViewPrefKey, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS[key], value);
  } catch {
    /* storage denied — fall back to URL-only behaviour */
  }
}

export type LayoutValue = "waterfall" | "grid" | "justified" | "list";

const LAYOUT_CYCLE: ReadonlyArray<LayoutValue> = [
  "waterfall",
  "grid",
  "justified",
  "list",
];

export function isLayoutValue(value: string): value is LayoutValue {
  return (LAYOUT_CYCLE as ReadonlyArray<string>).includes(value);
}

export function nextLayout(current: LayoutValue): LayoutValue {
  const idx = LAYOUT_CYCLE.indexOf(current);
  return LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length] ?? "waterfall";
}
