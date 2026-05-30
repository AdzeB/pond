export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0\u00A0B";
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;
  if (n >= TB) return `${(n / TB).toFixed(2)}\u00A0TB`;
  if (n >= GB) return `${(n / GB).toFixed(2)}\u00A0GB`;
  if (n >= MB) return `${(n / MB).toFixed(1)}\u00A0MB`;
  if (n >= KB) return `${(n / KB).toFixed(1)}\u00A0KB`;
  return `${n}\u00A0B`;
}
