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
