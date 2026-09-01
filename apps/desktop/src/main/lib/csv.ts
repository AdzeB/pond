export type CsvCell = string | number | readonly string[] | null;

export function toCsv(
  rows: ReadonlyArray<ReadonlyArray<CsvCell>>,
  columns: ReadonlyArray<string>,
): string {
  const lines: string[] = [columns.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\r\n");
}

function escapeCsv(value: CsvCell): string {
  if (value == null) return "";
  const s = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
