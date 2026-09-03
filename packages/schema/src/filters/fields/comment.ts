import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const comment = defineField({
  id: "comment",
  type: "optional",
  label: "Comment",
  group: "content",
  project: (s) =>
    (s.comments ?? [])
      .map((entry) => entry.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .toLowerCase() || null,
  sqlProjection: () => sql`nullif(
    lower(coalesce(json_extract(${saves.comments}, '$'), '')),
    '[]'
  )`,
});
