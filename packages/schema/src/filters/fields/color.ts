import { defineField } from "./descriptor";

// In-memory only: matching runs the `near` comparator over the stored
// palette, so there is no SQL projection.
export const color = defineField({
  id: "color",
  type: "color",
  label: "Color",
  group: "media",
  project: (s) => s.dominantColors ?? [],
});
