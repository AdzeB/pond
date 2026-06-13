import { defineField } from "./descriptor";

// In-memory only: `near` comparator runs over the stored palette, no SQL projection.
export const color = defineField({
  id: "color",
  type: "color",
  label: "Color",
  group: "media",
  project: (s) => s.dominantColors ?? [],
});
