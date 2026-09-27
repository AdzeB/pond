import { z } from "zod";

const TOKEN =
  /\{(n|title|id|family|date|tags|original)(?::([a-z]+|\d{1,2}))?\}/g;

export const RenameReplacementSchema = z.object({
  find: z.string().min(1).max(500),
  replace: z.string().max(500),
  flags: z
    .string()
    .regex(/^[gimsuy]*$/)
    .default("g"),
});

export interface RenameTemplateValues {
  index: number;
  start?: number;
  padding?: number;
  title: string;
  id: string;
  family?: string | null;
  date?: Date | string | number | null;
  tags?: readonly string[];
  original?: string | null;
  replacement?: z.input<typeof RenameReplacementSchema> | null;
}

function formattedDate(
  value: RenameTemplateValues["date"],
  format?: string,
): string {
  const date = value == null ? new Date() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString();
  switch (format) {
    case "compact":
      return iso.slice(0, 10).replaceAll("-", "");
    case "year":
      return iso.slice(0, 4);
    case "month":
      return iso.slice(0, 7);
    case "timestamp":
      return `${iso.slice(0, 10).replaceAll("-", "")}-${iso.slice(11, 19).replaceAll(":", "")}`;
    default:
      return iso.slice(0, "YYYY-MM-DD".length);
  }
}

function replaceSource(
  source: string,
  replacement: RenameTemplateValues["replacement"],
): string {
  if (!replacement) return source;
  const parsed = RenameReplacementSchema.parse(replacement);
  return source.replace(new RegExp(parsed.find, parsed.flags), parsed.replace);
}

export function applyRenameTemplate(
  template: string,
  values: RenameTemplateValues,
): string {
  const original = values.original?.trim() || values.title;
  const title = replaceSource(values.title, values.replacement);
  const sequence = (values.start ?? 1) + values.index;
  return template
    .replace(TOKEN, (_match, token: string, tokenPadding?: string) => {
      switch (token) {
        case "n":
          return String(sequence).padStart(
            tokenPadding && /^\d+$/.test(tokenPadding)
              ? Number.parseInt(tokenPadding, 10)
              : (values.padding ?? 1),
            "0",
          );
        case "title":
          return title;
        case "id":
          return values.id;
        case "family":
          return values.family?.trim() || title;
        case "date":
          return formattedDate(values.date, tokenPadding);
        case "tags":
          return values.tags?.join(", ") ?? "";
        case "original":
          return original;
        default:
          return _match;
      }
    })
    .trim();
}
