import type { FieldId } from "../types";
import { account } from "./account";
import { caption } from "./caption";
import { color } from "./color";
import { comment } from "./comment";
import { creator } from "./creator";
import type { FieldDescriptor } from "./descriptor";
import { aspect, shape } from "./dims";
import { duration } from "./duration";
import { fileCount } from "./file-count";
import { fileSize } from "./file-size";
import { folder } from "./folder";
import { format } from "./format";
import { list } from "./list";
import { modifiedAt } from "./modified-at";
import { note } from "./note";
import { publishedAt } from "./published-at";
import { rating } from "./rating";
import { savedAt } from "./saved-at";
import { height, width } from "./size";
import { source } from "./source";
import { tags } from "./tags";
import { transcript } from "./transcript";
import { typeField } from "./type";
import { url } from "./url";

export type {
  FieldDescriptor,
  FieldGroup,
  FieldPreset,
} from "./descriptor";
export { aspectFromDims, shapeFromDims } from "./dims";
export {
  durationProjection,
  folderExists,
  tagsDistinctCount,
  tagsEmpty,
  tagsExists,
} from "./sql";

export const FIELD_DESCRIPTORS = {
  tags,
  folder,
  list,
  source,
  type: typeField,
  format,
  fileCount,
  duration,
  shape,
  aspect,
  creator,
  account,
  note,
  caption,
  transcript,
  color,
  savedAt,
  publishedAt,
  modifiedAt,
  rating,
  fileSize,
  width,
  height,
  url,
  comment,
} satisfies Record<FieldId, FieldDescriptor>;
