import { usePrefs } from "@/pool/prefs";

export type Density = "compact" | "comfortable" | "spacious";

const DENSITY_ITEM_GAP: Record<Density, number> = {
  compact: 8,
  comfortable: 16,
  spacious: 28,
};

const DEFAULT_DENSITY: Density = "comfortable";

const VALID = new Set<Density>(["compact", "comfortable", "spacious"]);

function coerce(value: unknown): Density {
  if (typeof value === "string" && VALID.has(value as Density)) {
    return value as Density;
  }
  return DEFAULT_DENSITY;
}

export function useDensity(): [Density, (next: Density) => void] {
  const [prefs, patch] = usePrefs("preferences");
  const current = coerce(prefs.density);
  const set = (next: Density) => {
    if (next === current) return;
    patch({ density: next });
  };
  return [current, set];
}

export function useItemGap(): number {
  const [prefs] = usePrefs("preferences");
  return DENSITY_ITEM_GAP[coerce(prefs.density)];
}
