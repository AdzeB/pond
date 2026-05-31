import { defineField } from "./descriptor";
import { durationSeconds } from "./shared";
import { durationProjection } from "./sql";

const DURATION_PRESETS = [
  { id: "short", label: "< 30s", value: 30 },
  { id: "medium", label: "< 3min", value: 180 },
  { id: "long", label: "< 10min", value: 600 },
  { id: "longer", label: "≥ 10min", value: 600 },
] as const;

export const duration = defineField({
  id: "duration",
  type: "number",
  label: "Duration",
  group: "media",
  presets: DURATION_PRESETS,
  project: (s) => durationSeconds(s),
  sqlProjection: () => durationProjection(),
});
