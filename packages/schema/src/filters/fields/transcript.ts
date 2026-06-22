import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

// has:transcript — video/audio saves with an on-device speech transcript.
export const transcript = defineField({
  id: "transcript",
  type: "optional",
  label: "Transcript",
  group: "content",
  project: (s) => ((s.transcript ?? "").trim() ? true : null),
  sqlProjection: () => sql`nullif(trim(coalesce(${saves.transcript}, '')), '')`,
});
