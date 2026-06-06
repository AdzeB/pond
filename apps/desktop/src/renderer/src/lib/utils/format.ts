const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${Math.round(bytes)}\u00A0B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = unit >= 3 ? 2 : 1;
  return `${value.toFixed(decimals)}\u00A0${BYTE_UNITS[unit]}`;
}

// Compact count: 1_200 -> "1.2k", 3_000_000 -> "3M".
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (n >= 1_000_000) return `${trimZero(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trimZero(n / 1_000)}k`;
  return String(Math.round(n));
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

// Seconds -> "m:ss" (or "h:mm:ss" past an hour).
export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// "dd/mm/yyyy"; echoes the input back if it isn't a valid date.
export function formatShortDate(value: string | number): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// "yyyy/mm/dd hh:mi"; empty string for nullish/empty input.
export function formatAbsolute(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}
