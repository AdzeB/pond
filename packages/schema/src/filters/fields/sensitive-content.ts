import { sql } from "drizzle-orm";
import {
  LIKELY_SENSITIVE_THRESHOLD,
  POSSIBLE_SENSITIVE_THRESHOLD,
  sensitiveContentBand,
} from "../../content-safety";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const SENSITIVE_CONTENT_PRESETS = [
  {
    id: "not-sensitive",
    label: "Not Sensitive",
    value: "not-sensitive",
  },
  {
    id: "possible-sensitive",
    label: "Possibly Sensitive",
    value: "possible-sensitive",
  },
  {
    id: "likely-sensitive",
    label: "Likely Sensitive",
    value: "likely-sensitive",
  },
  { id: "not-checked", label: "Not Checked", value: "not-checked" },
] as const;

export const sensitiveContent = defineField({
  id: "sensitiveContent",
  type: "enum",
  label: "Sensitive Content",
  group: "content",
  presets: SENSITIVE_CONTENT_PRESETS,
  project: (save) => sensitiveContentBand(save.sensitiveScore),
  sqlProjection: () => sql`
    case
      when ${saves.sensitiveScore} is null then 'not-checked'
      when ${saves.sensitiveScore} >= ${LIKELY_SENSITIVE_THRESHOLD} then 'likely-sensitive'
      when ${saves.sensitiveScore} >= ${POSSIBLE_SENSITIVE_THRESHOLD} then 'possible-sensitive'
      else 'not-sensitive'
    end
  `,
});
