import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const DIMENSIONS_PRESETS = [
  { id: "small", label: "< 720 px", value: 720 },
  { id: "medium", label: "< 1080 px", value: 1080 },
  { id: "large", label: "< 4000 px", value: 4000 },
  { id: "huge", label: "≥ 4000 px", value: 4000 },
] as const;

export const dimensions = defineField({
  id: "dimensions",
  type: "number",
  label: "Dimensions",
  group: "media",
  presets: DIMENSIONS_PRESETS,
  project: (s) => {
    const longest = Math.max(s.width ?? 0, s.height ?? 0);
    return longest || null;
  },
  sqlProjection: () => sql`max(${saves.width}, ${saves.height})`,
});
