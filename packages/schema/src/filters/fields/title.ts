import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const title = defineField({
  id: "title",
  type: "string",
  label: "Name",
  group: "content",
  project: (save) => save.title?.toLowerCase() ?? null,
  sqlProjection: () => sql`lower(${saves.title})`,
});
