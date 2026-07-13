import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

/** has:caption — saves with an on-device vision caption. */
export const caption = defineField({
  id: "caption",
  type: "optional",
  label: "Caption",
  group: "content",
  project: (s) => ((s.caption ?? "").trim() ? true : null),
  sqlProjection: () => sql`nullif(trim(coalesce(${saves.caption}, '')), '')`,
});
