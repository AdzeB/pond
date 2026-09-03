import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const FILE_SIZE_PRESETS = [
  { id: "small", label: "< 1 MB", value: 1_000_000 },
  { id: "medium", label: "< 10 MB", value: 10_000_000 },
  { id: "large", label: "≥ 10 MB", value: 10_000_000 },
] as const;

export const fileSize = defineField({
  id: "fileSize",
  type: "number",
  label: "Size",
  group: "media",
  presets: FILE_SIZE_PRESETS,
  project: (s) => s.fileSize ?? 0,
  sqlProjection: () => sql`${saves.fileSize}`,
});
