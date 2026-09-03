import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const url = defineField({
  id: "url",
  type: "string",
  label: "URL",
  group: "content",
  project: (s) => s.url.trim().toLowerCase(),
  sqlProjection: () => sql`lower(${saves.url})`,
});
