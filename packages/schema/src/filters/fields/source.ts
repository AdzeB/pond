import { sourceIdentity } from "../../domain";
import { defineField } from "./descriptor";

export const source = defineField({
  id: "source",
  type: "enum",
  label: "Source",
  group: "content",
  project: (s) => sourceIdentity(s),
});
