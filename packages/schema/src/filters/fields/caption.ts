import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const caption = defineField({
  id: "caption",
  type: "optional",
  label: "Caption",
  group: "content",
  project: (s) => (s.caption ?? "").trim().toLowerCase() || null,
  sqlProjection: () => sql`nullif(trim(coalesce(${saves.caption}, '')), '')`,
});
