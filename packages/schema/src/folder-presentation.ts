import { z } from "zod";

export const FolderPresentationSchema = z.object({
  icon: z
    .enum(["folder", "bookmark", "album", "tag", "download", "code"])
    .optional(),
  layout: z.enum(["waterfall", "grid", "justified", "list"]).catch("waterfall"),
  sortKey: z.string().catch("savedAt"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  zoom: z.number().finite().catch(130),
  includeSubfolders: z.boolean().catch(true),
  randomSeed: z.string().catch("pond"),
  manualOrder: z.array(z.string()).catch([]),
  pinnedIds: z.array(z.string()).catch([]),
  coverSaveId: z.string().nullable().catch(null),
});
