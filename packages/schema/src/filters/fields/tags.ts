import { defineField } from "./descriptor";

export const tags = defineField({
  id: "tags",
  type: "stringArray",
  label: "Tags",
  group: "content",
  project: (s) => (s.tags ?? []).map((t) => t.toLowerCase()),
});
