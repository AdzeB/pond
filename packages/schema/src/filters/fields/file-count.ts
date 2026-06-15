import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const fileCount = defineField({
  id: "fileCount",
  type: "number",
  label: "Files",
  group: "media",
  project: (s) => s.files?.length ?? 0,
  sqlProjection: () => sql`json_array_length(${saves.files})`,
});
