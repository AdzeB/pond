import { z } from "zod";

export const librarySearchSchema = z.looseObject({
  q: z.string().optional(),
  view: z.enum(["waterfall", "grid", "list", "justified"]).optional(),
  sort: z.enum(["savedAt", "title", "fileSize"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  capture: z.literal("1").optional(),
  url: z.string().optional(),
});

// Strip the trailing /detail/:id or /save/:id from a list URL so callers
// can derive the "parent" list base.
export function listBaseFromPath(pathname: string): string {
  return (
    pathname.replace(/\/(?:detail|save)\/[^/]+\/?$/, "").replace(/\/+$/, "") ||
    "/"
  );
}
