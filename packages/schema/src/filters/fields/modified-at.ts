import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";
import { toMillis } from "./shared";

export const modifiedAt = defineField({
  id: "modifiedAt",
  type: "date",
  label: "Date Modified",
  group: "time",
  project: (s) => toMillis(s.createdAt ?? s.savedAt),
  sqlProjection: () => sql`coalesce(${saves.createdAt}, ${saves.savedAt})`,
});
