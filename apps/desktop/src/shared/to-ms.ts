/** Coerce IPC/DB timestamps (number, Date, numeric string, ISO) to epoch ms. */
export function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === "string") {
    const asNum = Number(v);
    if (!Number.isNaN(asNum) && v.trim() !== "" && Number.isFinite(asNum)) {
      return asNum;
    }
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
