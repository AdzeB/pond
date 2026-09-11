import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const comment = defineField({
  id: "comment",
  type: "optional",
  label: "Comment",
  group: "content",
  project: (s) =>
    [...(s.comments ?? []), ...(s.videoNotes ?? [])]
      .map((entry) => entry.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .toLowerCase() || null,
  sqlProjection: () => sql`(
    select nullif(lower(group_concat(text, ' ')), '') from (
      select trim(json_extract(value, '$.text')) as text
      from json_each(${saves.comments})
      union all
      select trim(json_extract(value, '$.text')) as text
      from json_each(${saves.videoNotes})
    ) where text is not null and text <> ''
  )`,
});
