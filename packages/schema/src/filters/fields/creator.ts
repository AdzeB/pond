import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

// Enum picked from distinct authors (see CreatorBody); case-insensitive match.
export const creator = defineField({
  id: "creator",
  type: "enum",
  label: "Creator",
  group: "people",
  project: (s) => (s.author ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(${saves.author})`,
});
