import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

// Picked from the live list of distinct authors (see CreatorBody), so it
// behaves like an enum (is / is any of / is not / is none of) rather than a
// free-text string. Matching is case-insensitive (see match.ts scalarEqual).
export const creator = defineField({
  id: "creator",
  type: "enum",
  label: "Creator",
  group: "people",
  project: (s) => (s.author ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(${saves.author})`,
});
