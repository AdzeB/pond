import { COLOR_PRESETS } from "@pond/schema/filters/color";
import type { Predicate } from "@pond/schema/filters/types";

export function summariseValue(p: Predicate): string {
  const v = p.value;
  if (p.operator === "exists") return v === false ? "Without" : "With";
  if (p.field === "color" && typeof v === "string" && v) {
    const preset = COLOR_PRESETS.find(
      (c) => c.hex.toLowerCase() === v.toLowerCase(),
    );
    return preset?.label ?? v;
  }
  if (Array.isArray(v)) {
    if (p.operator === "between") {
      const [lo, hi] = v;
      if (lo == null && hi == null) return "Select";
      return `${lo ?? ""}–${hi ?? ""}`;
    }
    if (v.length === 0) return "Select";
    if (v.length === 1) return String(v[0]);
    return `${v.length} values`;
  }
  if (typeof v === "string") return v || "Select";
  if (typeof v === "number") return String(v);
  return "Select";
}
