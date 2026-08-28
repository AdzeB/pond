import {
  LIST_KIND_LABELS,
  LIST_KINDS,
  normalizeListKinds,
} from "../../list-kinds";
import { defineField } from "./descriptor";

const LIST_PRESETS = LIST_KINDS.map((id) => ({
  id,
  label: LIST_KIND_LABELS[id],
  value: id,
}));

export const list = defineField({
  id: "list",
  type: "stringArray",
  label: "List",
  group: "content",
  presets: LIST_PRESETS,
  project: (s) => normalizeListKinds(s.listKinds),
});
