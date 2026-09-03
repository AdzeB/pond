import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const RATING_PRESETS = [
  { id: "unrated", label: "Unrated", value: 0 },
  { id: "1", label: "1 Star", value: 1 },
  { id: "2", label: "2 Stars", value: 2 },
  { id: "3", label: "3 Stars", value: 3 },
  { id: "4", label: "4 Stars", value: 4 },
  { id: "5", label: "5 Stars", value: 5 },
] as const;

export const rating = defineField({
  id: "rating",
  type: "number",
  label: "Rating",
  group: "content",
  presets: RATING_PRESETS,
  project: (s) => s.rating ?? 0,
  sqlProjection: () => sql`coalesce(${saves.rating}, 0)`,
});
