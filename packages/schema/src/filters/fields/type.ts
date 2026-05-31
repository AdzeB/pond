import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const TYPE_PRESETS = [
  { id: "image", label: "Image", value: "image" },
  { id: "video", label: "Video", value: "video" },
  { id: "mixed", label: "Mixed", value: "mixed" },
  { id: "url", label: "URL", value: "url" },
] as const;

export const typeField = defineField({
  id: "type",
  type: "enum",
  label: "Type",
  group: "media",
  presets: TYPE_PRESETS,
  project: (s) => (s.mediaType ?? s.source ?? "").toLowerCase(),
  sqlProjection: () =>
    sql`lower(coalesce(${saves.mediaType}, ${saves.source}))`,
});
