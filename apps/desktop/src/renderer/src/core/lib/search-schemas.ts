import { z } from "zod";

export const librarySearchSchema = z.looseObject({
  q: z.string().optional(),
  view: z.enum(["waterfall", "grid", "list", "justified"]).optional(),
  sort: z.enum(["savedAt", "title", "fileSize"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  capture: z.literal("1").optional(),
  url: z.string().optional(),
});

export const SOURCE_TABS = [
  "overview",
  "saves",
  "analytics",
  "manage",
] as const;
export type SourceTab = (typeof SOURCE_TABS)[number];

// The source detail page carries every library search key (so the embedded
// grid keeps working) plus a `tab` selector for the detail tabs.
export const sourceSearchSchema = librarySearchSchema.extend({
  tab: z.enum(SOURCE_TABS).optional(),
});

// Strip the trailing /detail/:id or /save/:id from a list URL so callers
// can derive the "parent" list base.
export function listBaseFromPath(pathname: string): string {
  return (
    pathname.replace(/\/(?:detail|save)\/[^/]+\/?$/, "").replace(/\/+$/, "") ||
    "/"
  );
}

// True for the source detail page itself (`/source/:source`), but not its
// nested grid/detail routes (`/source/:source/save/:id`, `.../detail/:id`).
// Used to decide whether the source view's own chrome replaces the library
// toolbar.
export function isSourceDetailRoot(pathname: string): boolean {
  return /^\/source\/[^/]+\/?$/.test(pathname);
}
