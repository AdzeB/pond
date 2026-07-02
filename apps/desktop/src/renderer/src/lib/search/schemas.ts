import { z } from "zod";

export const librarySearchSchema = z.looseObject({
  q: z.string().optional(),
  view: z.enum(["waterfall", "grid", "justified"]).optional(),
  sort: z
    .enum([
      "savedAt",
      "createdAt",
      "title",
      "fileSize",
      "fileCount",
      "dimensions",
      "creator",
      "source",
      "type",
    ])
    .optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  capture: z.literal("1").optional(),
  url: z.string().optional(),
  // Open save id. Drives the detail overlay so opening a save is a history entry.
  detail: z.string().optional(),
});

// Strip a trailing /detail/:id or /save/:id to get the parent list base.
export function listBaseFromPath(pathname: string): string {
  return (
    pathname.replace(/\/(?:detail|save)\/[^/]+\/?$/, "").replace(/\/+$/, "") ||
    "/"
  );
}
