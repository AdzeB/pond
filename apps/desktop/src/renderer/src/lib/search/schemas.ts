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
});

export function listBaseFromPath(pathname: string): string {
  return pathname.replace(/\/save\/[^/]+\/?$/, "").replace(/\/+$/, "") || "/";
}
