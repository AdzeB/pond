import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";
import { toMillis } from "./shared";

export const savedAt = defineField({
  id: "savedAt",
  type: "date",
  label: "Date Saved",
  group: "time",
  project: (s) => toMillis(s.savedAt),
  sqlProjection: () => sql`${saves.savedAt}`,
});
