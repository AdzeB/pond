import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

// On-device NSFW verdict. Unclassified saves project to `null`, so they match
// neither "Sensitive" nor "Safe" (the background classifier fills them in).
const SENSITIVITY_PRESETS = [
  { id: "sensitive", label: "Sensitive", value: "sensitive" },
  { id: "safe", label: "Safe", value: "safe" },
] as const;

export const sensitivity = defineField({
  id: "sensitivity",
  type: "enum",
  label: "Sensitivity",
  group: "media",
  presets: SENSITIVITY_PRESETS,
  project: (s) => s.sensitivity ?? null,
  sqlProjection: () => sql`lower(${saves.sensitivity})`,
});
