import { defineField } from "./descriptor";

export const color = defineField({
  id: "color",
  type: "color",
  label: "Color",
  group: "media",
  project: (s) => s.dominantColors ?? [],
});
