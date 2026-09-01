import { defineField } from "./descriptor";

export const folder = defineField({
  id: "folder",
  type: "stringArray",
  label: "Folders",
  group: "content",
  project: (s) => (s.folderIds ?? []).map((id) => id.toLowerCase()),
});
