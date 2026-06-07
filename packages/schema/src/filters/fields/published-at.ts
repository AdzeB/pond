import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";
import { toMillis } from "./shared";

export const publishedAt = defineField({
  id: "publishedAt",
  type: "date",
  label: "Date Published",
  group: "time",
  project: (s) => toMillis(s.publishedAt),
  sqlProjection: () => sql`${saves.publishedAt}`,
});
