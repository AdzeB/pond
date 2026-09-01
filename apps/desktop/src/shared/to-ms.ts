import type { WireJson } from "./wire";

export function toMs(v: WireJson | undefined): number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (v instanceof Object || v === true || v === false) return null;

  const text = String(v).trim();
  if (!text) return null;
  const num = Number(text);
  if (Number.isFinite(num)) return num;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}
