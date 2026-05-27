import { z } from "zod";

export const librarySearchSchema = z.looseObject({
  q: z.string().optional(),
  view: z.enum(["waterfall", "grid", "list", "justified"]).optional(),
  sort: z.enum(["savedAt", "title", "fileSize"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  capture: z.literal("1").optional(),
  url: z.string().optional(),
});
export type LibrarySearch = z.infer<typeof librarySearchSchema>;

// Convert TSR's parsed search object back into URLSearchParams so the
// existing filter helpers (`readQuery`, `tagFilterSearch`) keep working.
export function searchToParams(
  search: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === undefined || v === null) continue;
        params.append(key, String(v));
      }
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}

// Reverse of `searchToParams`: collapse a URLSearchParams back into a
// plain object that TSR can store as route search state. Keys with
// multiple values become string[] so order is preserved.
export function paramsToSearch(
  params: URLSearchParams,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length === 0) continue;
    out[key] = values.length === 1 ? (values[0] as string) : values;
  }
  return out;
}

// Strip the trailing /detail/:id or /save/:id from a list URL so callers
// can derive the "parent" list base.
export function listBaseFromPath(pathname: string): string {
  return (
    pathname.replace(/\/(?:detail|save)\/[^/]+\/?$/, "").replace(/\/+$/, "") ||
    "/"
  );
}
