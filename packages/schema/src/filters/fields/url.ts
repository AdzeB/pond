import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const url = defineField({
  id: "url",
  type: "optional",
  label: "URL",
  group: "content",
  project: (s) => s.url.trim().toLowerCase() || null,
  sqlProjection: () => sql`nullif(trim(lower(${saves.url})), '')`,
});
