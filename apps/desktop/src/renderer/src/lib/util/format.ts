import prettyBytes from "pretty-bytes";
import prettyMs from "pretty-ms";

const numberFormatter = new Intl.NumberFormat(undefined, {
  useGrouping: true,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

// Locale-aware integer with grouping separators: 1254 -> "1,254".
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "-";
  return numberFormatter.format(n);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "-";
  return prettyBytes(bytes, { binary: true });
}

// Compact count: 1_200 -> "1.2K", 3_000_000 -> "3M".
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "-";
  return compactFormatter.format(n);
}

// Seconds -> "m:ss" (or "h:mm:ss" past an hour).
export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  return prettyMs(total * 1000, {
    colonNotation: true,
    secondsDecimalDigits: 0,
  });
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

const tsTime = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const tsDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// "3:47 PM · Feb 11, 2026"; empty string for nullish/invalid input.
export function formatTimestampLine(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return `${tsTime.format(d)} · ${tsDate.format(d)}`;
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
