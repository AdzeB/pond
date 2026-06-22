import type { FieldId } from "../types";
import { caption } from "./caption";
import { color } from "./color";
import { creator } from "./creator";
import type { FieldDescriptor } from "./descriptor";
import { duration } from "./duration";
import { fileCount } from "./file-count";
import { modifiedAt } from "./modified-at";
import { note } from "./note";
import { publishedAt } from "./published-at";
import { savedAt } from "./saved-at";
import { sensitivity } from "./sensitivity";
import { source } from "./source";
import { tags } from "./tags";
import { transcript } from "./transcript";
import { typeField } from "./type";

export type {
  FieldDescriptor,
  FieldGroup,
  FieldPreset,
} from "./descriptor";
export { tagsDistinctCount, tagsEmpty, tagsExists } from "./sql";

// Insertion order is the field display order (FIELD_IDS, filter bar chips).
export const FIELD_DESCRIPTORS: Record<FieldId, FieldDescriptor> = {
  tags,
  source,
  type: typeField,
  fileCount,
  duration,
  creator,
  note,
  caption,
  transcript,
  color,
  sensitivity,
  savedAt,
  publishedAt,
  modifiedAt,
};
