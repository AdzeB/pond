export function toCsv(
  rows: ReadonlyArray<Record<string, unknown>>,
  columns: ReadonlyArray<string>,
): string {
  const lines: string[] = [columns.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsv(row[c])).join(","));
  }
  return lines.join("\r\n");
}

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const s = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
