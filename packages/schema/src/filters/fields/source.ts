import { sourceIdentity } from "../../domain";
import { defineField } from "./descriptor";

/** In-memory only until SQL can match `sourceIdentity` (URL/domain fallback + alias collapse). */
export const source = defineField({
  id: "source",
  type: "enum",
  label: "Source",
  group: "content",
  project: (s) => sourceIdentity(s),
});
