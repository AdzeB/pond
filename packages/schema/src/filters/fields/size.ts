import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const SIZE_PRESETS = [
  { id: "tiny", label: "< 1 MB", value: 1_000_000 },
  { id: "small", label: "< 5 MB", value: 5_000_000 },
  { id: "medium", label: "< 25 MB", value: 25_000_000 },
  { id: "large", label: "≥ 25 MB", value: 25_000_000 },
] as const;

export const size = defineField({
  id: "size",
  type: "number",
  label: "File size",
  group: "media",
  presets: SIZE_PRESETS,
  project: (s) => s.fileSize ?? null,
  sqlProjection: () => sql`${saves.fileSize}`,
});
