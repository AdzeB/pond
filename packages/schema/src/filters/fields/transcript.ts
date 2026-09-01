import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const transcript = defineField({
  id: "transcript",
  type: "optional",
  label: "Transcript",
  group: "content",
  project: (s) => (s.transcript ?? "").trim().toLowerCase() || null,
  sqlProjection: () => sql`nullif(trim(coalesce(${saves.transcript}, '')), '')`,
});
