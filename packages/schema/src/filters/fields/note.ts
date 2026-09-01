import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const note = defineField({
  id: "note",
  type: "optional",
  label: "Note",
  group: "content",
  project: (s) => (s.notes ?? s.description ?? "").trim().toLowerCase() || null,
  sqlProjection: () => sql`nullif(
    trim(coalesce(${saves.notes}, ${saves.description}, '')),
    ''
  )`,
});
